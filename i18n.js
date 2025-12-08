import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// === IMPORTERA ALLA SPRÅK ===
import sv from "./locales/sv/translation.json";
import en from "./locales/en/translation.json";
import no from "./locales/no/translation.json";
import fi from "./locales/fi/translation.json";
import es from "./locales/es/translation.json";
import fr from "./locales/fr/translation.json";
import de from "./locales/de/translation.json";
import zh from "./locales/zh/translation.json";
import ja from "./locales/ja/translation.json";
import pt from "./locales/pt/translation.json";
import it from "./locales/it/translation.json";
import hi from "./locales/hi/translation.json";
import ko from "./locales/ko/translation.json";
import nl from "./locales/nl/translation.json";

// === INITIERA I18N ===
i18n.use(initReactI18next).init({
  resources: {
    sv: { translation: sv },
    en: { translation: en },
    no: { translation: no },
    fi: { translation: fi },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    zh: { translation: zh },
    ja: { translation: ja },
    pt: { translation: pt },
    it: { translation: it },
    hi: { translation: hi },
    ko: { translation: ko },
    nl: { translation: nl },
  },
  lng: localStorage.getItem("lang") || "sv", // 👈 använder sparat språk eller svenska som standard
  fallbackLng: "en", // 👈 fallback till engelska om översättning saknas
  interpolation: {
    escapeValue: false,
  },
});

// 👇 spara språk automatiskt när man byter
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("lang", lng);
});

export default i18n;
