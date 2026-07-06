"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { grantDeepgramToken } from "@/lib/actions/interview";

/**
 * Escucha activa por voz (Fase 3, spec `2026-07-06-live-stt-deepgram-design.md`).
 * Hook cliente que: pide un token efímero al servidor (`grantDeepgramToken`),
 * captura audio del micrófono o de una pestaña (Meet), abre un WebSocket directo
 * a Deepgram y transmite el audio; emite transcripción interina y final por
 * callbacks. El secreto nunca sale al cliente (solo el token JWT, TTL 60s).
 *
 * Se usa el `WebSocket` nativo (no el SDK): en el navegador la auth va por
 * subprotocolo `["bearer", <token>]` (los headers no se pueden enviar en un
 * WebSocket de navegador). Verificado contra Deepgram.
 *
 * No testeable con audio real en CI (sin micrófono); la prueba en vivo la hace
 * el usuario. La degradación (sin permisos/clave) devuelve error "stt_disabled"
 * y el panel mantiene las entradas manual/pegar.
 */

export type SttStatus = "idle" | "connecting" | "listening" | "error";
export type SttSource = "mic" | "tab";
export type SttError = "stt_disabled" | "mic_denied" | "generic";

interface UseDeepgramLiveArgs {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: SttError) => void;
}

const DEEPGRAM_URL = `wss://api.deepgram.com/v1/listen?${new URLSearchParams({
  model: "nova-2",
  language: "es",
  smart_format: "true",
  interim_results: "true",
}).toString()}`;

// MediaRecorder no soporta el mismo mimeType en todos los navegadores; se elige
// el primero disponible (Deepgram autodetecta el contenedor webm/opus).
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function useDeepgramLive({ onInterim, onFinal, onError }: UseDeepgramLiveArgs) {
  const [status, setStatus] = useState<SttStatus>("idle");

  // Refs mutables del ciclo de vida de la conexión (no re-render).
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Marca de parada intencional (para no reportar error en el close normal).
  const stoppingRef = useRef(false);

  // Callbacks en refs para no recrear start/stop en cada render.
  const cbRef = useRef({ onInterim, onFinal, onError });
  useEffect(() => {
    cbRef.current = { onInterim, onFinal, onError };
  }, [onInterim, onFinal, onError]);

  const cleanup = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* noop */
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const ws = socketRef.current;
    socketRef.current = null;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "CloseStream" }));
        }
        ws.close();
      } catch {
        /* noop */
      }
    }
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  const start = useCallback(
    async (source: SttSource) => {
      stoppingRef.current = false;
      setStatus("connecting");
      const fail = (error: SttError) => {
        cleanup();
        setStatus("error");
        cbRef.current.onError?.(error);
      };

      // 1) Token efímero (secreto server-only; al cliente solo el JWT).
      const granted = await grantDeepgramToken();
      if (!granted.ok) return fail("stt_disabled");

      // 2) Captura de audio (mic presencial o audio de pestaña Meet).
      let stream: MediaStream;
      try {
        stream =
          source === "tab"
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            : await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return fail("mic_denied");
      }
      // getDisplayMedia trae video; el STT solo usa audio → descartar video.
      if (source === "tab") {
        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          return fail("mic_denied");
        }
        stream.getVideoTracks().forEach((t) => t.stop());
      }
      streamRef.current = stream;

      // 3) WebSocket directo a Deepgram (auth por subprotocolo bearer).
      let ws: WebSocket;
      try {
        ws = new WebSocket(DEEPGRAM_URL, ["bearer", granted.token]);
      } catch {
        return fail("generic");
      }
      socketRef.current = ws;

      ws.onopen = () => {
        if (socketRef.current !== ws) return; // parado durante la conexión
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };
        recorder.start(250);
        keepAliveRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
        setStatus("listening");
      };

      ws.onmessage = (event) => {
        let data: {
          type?: string;
          is_final?: boolean;
          channel?: { alternatives?: Array<{ transcript?: string }> };
        };
        try {
          data = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (data.type !== "Results") return;
        const text = data.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
        if (!text) return;
        if (data.is_final) cbRef.current.onFinal?.(text);
        else cbRef.current.onInterim?.(text);
      };

      ws.onerror = () => {
        if (!stoppingRef.current) fail("generic");
      };

      ws.onclose = () => {
        // Cierre inesperado antes/durante la escucha (no provocado por stop).
        if (!stoppingRef.current && socketRef.current === ws) fail("generic");
      };
    },
    [cleanup],
  );

  // Corta todo si el componente se desmonta con la escucha activa.
  useEffect(() => cleanup, [cleanup]);

  return { status, start, stop };
}
