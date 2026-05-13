<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useTheme } from '@/composables/useTheme';

const { syncFromTelegram } = useTheme();

function onTgThemeChange() {
  syncFromTelegram();
  const tg = window.Telegram?.WebApp;
  tg?.setHeaderColor?.('secondary_bg_color');
  const bg = tg?.themeParams?.bg_color;
  if (bg) tg?.setBackgroundColor?.(bg);
}

onMounted(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    onTgThemeChange();
    tg.onEvent('themeChanged', onTgThemeChange);
  }
});

onUnmounted(() => {
  window.Telegram?.WebApp?.offEvent?.('themeChanged', onTgThemeChange);
});
</script>

<style>
@import '@/styles/tokens.css';

*, *::before, *::after {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

html, body, #app {
  height: 100%;
  min-height: 100dvh;
  overscroll-behavior: none;
}

body {
  font-family: var(--font);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.5;
}

* { -webkit-tap-highlight-color: transparent; }
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }
button, input, select, textarea { font-family: var(--font); }

:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}

/* Global skeleton */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    var(--surface-2) 0%,
    var(--surface-1) 50%,
    var(--surface-2) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
