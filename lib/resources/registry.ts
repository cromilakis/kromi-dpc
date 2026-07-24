import type { ResourceArticle } from "./types";
import { LEY_21719 } from "./articles/ley-21719";
import { MULTAS_LEY_21719 } from "./articles/multas-ley-21719";
import { QUE_ES_EL_RAT } from "./articles/que-es-el-rat";
import { ENTRADA_EN_VIGENCIA_LEY_21719 } from "./articles/entrada-en-vigencia-ley-21719";
import { PROTECCION_DATOS_SALUD } from "./articles/proteccion-datos-salud";
import { CONSENTIMIENTO_DATOS_PERSONALES } from "./articles/consentimiento-datos-personales";
import { DERECHOS_ARCOP } from "./articles/derechos-arcop";
import { DATOS_SENSIBLES } from "./articles/datos-sensibles";
import { NOTIFICACION_BRECHAS_SEGURIDAD } from "./articles/notificacion-brechas-seguridad";
import { PROTECCION_DATOS_FINTECH } from "./articles/proteccion-datos-fintech";
import { PROTECCION_DATOS_RETAIL_ECOMMERCE } from "./articles/proteccion-datos-retail-ecommerce";
import { PROTECCION_DATOS_EMPRESAS_B2B } from "./articles/proteccion-datos-empresas-b2b";

/** Todos los artículos del centro de recursos (revisados o no). */
export const RESOURCE_ARTICLES: ResourceArticle[] = [
  LEY_21719,
  MULTAS_LEY_21719,
  QUE_ES_EL_RAT,
  ENTRADA_EN_VIGENCIA_LEY_21719,
  PROTECCION_DATOS_SALUD,
  CONSENTIMIENTO_DATOS_PERSONALES,
  DERECHOS_ARCOP,
  DATOS_SENSIBLES,
  NOTIFICACION_BRECHAS_SEGURIDAD,
  PROTECCION_DATOS_FINTECH,
  PROTECCION_DATOS_RETAIL_ECOMMERCE,
  PROTECCION_DATOS_EMPRESAS_B2B,
];

export function getArticle(slug: string): ResourceArticle | null {
  return RESOURCE_ARTICLES.find((a) => a.slug === slug) ?? null;
}

/** Artículos publicables (aprobados por revisión legal). */
export function getPublishedArticles(): ResourceArticle[] {
  return RESOURCE_ARTICLES.filter((a) => a.reviewed);
}
