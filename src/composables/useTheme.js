import { ref } from 'vue';

const THEME_KEY = 'uyda_theme';
const isDark = ref(localStorage.getItem(THEME_KEY) === 'dark');

function applyTheme() {
  if (isDark.value) {
    document.body.classList.add('theme-dark');
  } else {
    document.body.classList.remove('theme-dark');
  }
}

// Apply on module load
applyTheme();

export function useTheme() {
  function toggleTheme() {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    isDark.value = !isDark.value;
    applyTheme();
    localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light');
  }

  function syncFromTelegram() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    // Only sync if user hasn't manually set a preference
    if (!localStorage.getItem(THEME_KEY)) {
      isDark.value = tg.colorScheme === 'dark';
      applyTheme();
    }
  }

  return { isDark, toggleTheme, syncFromTelegram };
}
