import { signal } from '@angular/core';
import es from '../../public/i18n/es.json';
import en from '../../public/i18n/en.json';

type Idioma = 'es' | 'en';
const clave = 'studyflow.idioma';
function inicial(): Idioma {
  try { return localStorage.getItem(clave) === 'en' ? 'en' : 'es'; }
  catch { return 'es'; }
}
const actual = signal<Idioma>(inicial());
const catalogos: Record<Idioma, Record<string, string>> = { es, en };

export function t(key: string, args: Record<string, unknown> = {}): string {
  const texto = catalogos[actual()][key] ?? es[key as keyof typeof es] ?? key;
  return texto.replace(/\{(\d+)\}/g, (marca, i: string) => Object.hasOwn(args, i) ? String(args[i]) : marca);
}

// Only call this for API error messages, never for successful records or chat content.
const clavesDeMensaje = new Map(Object.entries(es).map(([key, value]) => [value, key]));
export function traducirError(mensaje: string) {
  const key = clavesDeMensaje.get(mensaje);
  return key ? t(key) : mensaje;
}

export const StudyFlowLanguage = {
  actual: actual.asReadonly(),
  locale: () => actual() === 'en' ? 'en-US' : 'es-CO',
  t,
  cambiar(idioma: Idioma) {
    actual.set(idioma);
    document.documentElement.lang = idioma;
    try { localStorage.setItem(clave, idioma); } catch { /* La elección permanece en esta vista. */ }
  }
};
document.documentElement.lang = actual();
