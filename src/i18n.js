import { createI18n } from "vue-i18n"; // Nomlangan eksport sifatida import qilish
import uzbekCyrillic from "./locales/uzbek-crylic";
import russian from "./locales/russian";
import axios from "axios";
import apiLink  from "@/config/api"

//User APIdan kelgan tilni olish
const fetchLang= async () => {
  try {
    const response = await axios.get(`${apiLink}/user?chatId=${window.Telegram.WebApp.initDataUnsafe.user.id}`, {
      headers: {
        "Authorization": "Basic " + btoa("admin:57325732"),
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    });
    const language = response.data.data.language;
    return language;
  } catch (error) {
    console.error("Error fetching user language:", error);
    // Agar xato bo'lsa, default tilni o'rnatish
    const language = "uzbek-crylic"; // Default til
    return language;
  }
}

const messages = {
  "uzbek-crylic": uzbekCyrillic,
  "russian": russian,
};

const i18n = createI18n({
  legacy: false, // Composition API bilan ishlash uchun
  locale: 'uzbek-crylic', // Default til
  fallbackLocale: "russian", // Agar til topilmasa
  messages,
});

if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    fetchLang().then(lang => {
        if (lang) {
            i18n.global.locale.value = lang;
        }
    });
}

export default i18n;