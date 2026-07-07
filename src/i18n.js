import { createI18n } from 'vue-i18n';
import uzbekCyrillic from './locales/uzbek-crylic';
import uzbekLatin from './locales/uzbek-latin';
import russian from './locales/russian';
import axios from 'axios';
import apiLink from '@/config/api';

const LANG_KEY = 'uyda_lang';

const savedLang = localStorage.getItem(LANG_KEY) || 'uzbek-crylic';

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'russian',
  messages: {
    'uzbek-crylic': uzbekCyrillic,
    'uzbek-latin': uzbekLatin,
    russian,
  },
});

// Fetch lang from API and update (non-blocking)
if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
  axios
    .get(`${apiLink}/user?chatId=${window.Telegram.WebApp.initDataUnsafe.user.id}`, {
      headers: {
        Authorization: 'Basic ' + btoa('admin:57325732'),
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    })
    .then(res => {
      const lang = res.data?.data?.language;
      if (lang === 'uzbek-crylic' || lang === 'uzbek-latin' || lang === 'russian') {
        i18n.global.locale.value = lang;
        localStorage.setItem(LANG_KEY, lang);
      }
    })
    .catch(() => {});
}

export default i18n;
export const LANG_STORAGE_KEY = LANG_KEY;
