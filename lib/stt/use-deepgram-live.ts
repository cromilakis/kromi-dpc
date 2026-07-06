"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DeepgramClient } from "@deepgram/sdk";
import { grantDeepgramToken } from "@/lib/actions/interview";

/**
 * Escucha activa por voz (Fase 3, spec `2026-07-06-live-stt-deepgram-design.md`).
 * Hook cliente que: pide un token efímero al servidor (`grantDeepgramToken`),
 * captura audio del micrófono o de una pestaña (Meet), abre el WebSocket directo
 * a Deepgram con el SDK y transmite el audio; emite transcripción interina y
 * final por callbacks. El secreto nunca sale al cliente (solo el token TTL 60s).
 *
 * No testeable con audio real en CI (sin micrófono); la prueba en vivo la hace
 * el usuario. La degradación (sin permisos/clave) devuelve error "stt_disabled"
 * y el panel mantiene las entradas manual/pegar.
 */

export type SttStatus = "idle" | "connecting" | "listening" | "error";
export type SttSource = "mic" | "tab";
export type SttError = "stt_disabled" | "mic_denied" | "generic";

// Tipo del socket de escucha en vivo, inferido del SDK (evita `any`).
type DeepgramLiveSocket = Awaited<
  ReturnType<InstanceType<typeof DeepgramClient>["listen"]["v1"]["connect"]>
>;

interface UseDeepgramLiveArgs {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: SttError) => void;
}

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
  const socketRef = useRef<DeepgramLiveSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    } catch {
      /* noop */
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      socketRef.current?.sendCloseStream({ type: "CloseStream" });
      socketRef.current?.close();
    } catch {
      /* noop */
    }
    socketRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  const start = useCallback(
    async (source: SttSource) => {
      setStatus("connecting");
      const fail = (error: SttError) => {
        cleanup();
        setStatus("error");
        cbRef.current.onError?.(error);
      };

      // 1) Token efímero.
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

      // 3) Conexión a Deepgram con el token.
      try {
        const dg = new DeepgramClient({ accessToken: granted.token });
        const socket = await dg.listen.v1.connect({
          model: "nova-2",
          language: "es",
          smart_format: "true",
          interim_results: "true",
        });
        socketRef.current = socket;

        socket.on("open", () => {
          const mimeType = pickMimeType();
          const recorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : undefined,
          );
          recorderRef.current = recorder;
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              try {
                socketRef.current?.sendMedia(event.data);
              } catch {
                /* socket cerrando */
              }
            }
          };
          recorder.start(250);
          keepAliveRef.current = setInterval(() => {
            try {
              socketRef.current?.sendKeepAlive({ type: "KeepAlive" });
            } catch {
              /* noop */
            }
          }, 8000);
          setStatus("listening");
        });

        socket.on("message", (message: unknown) => {
          const m = message as {
            type?: string;
            is_final?: boolean;
            channel?: { alternatives?: Array<{ transcript?: string }> };
          };
          if (m.type !== "Results") return;
          const text = m.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
          if (!text) return;
          if (m.is_final) cbRef.current.onFinal?.(text);
          else cbRef.current.onInterim?.(text);
        });

        socket.on("error", () => fail("generic"));
      } catch {
        return fail("generic");
      }
    },
    [cleanup],
  );

  // Corta todo si el componente se desmonta con la escucha activa.
  useEffect(() => cleanup, [cleanup]);

  return { status, start, stop };
}
