import i18next from "i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import zh from "./locales/zh.json";

const i18n = i18next.createInstance();

// Synchronous since resources are provided inline (no async backend)
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    // Translated strings are inserted via Obsidian API methods, not
    // innerHTML, so HTML escaping is not needed (and would cause literal
    // values like "&amp;" in the UI).
    escapeValue: false,
  },
  resources: {
    en: { translation: en },
    es: { translation: es },
    zh: { translation: zh },
  },
});

export function setLanguage(lng: string) {
  return i18n.changeLanguage(lng);
}

export const t = i18n.t.bind(i18n);
