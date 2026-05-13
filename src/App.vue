<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }
});
</script>

<style>
@import '@/styles/tokens.css';

*, *::before, *::after {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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

/* Prevent iOS tap flash */
* { -webkit-tap-highlight-color: transparent; }

/* Smooth scrolling */
:root { scroll-behavior: smooth; }

/* Focus ring for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}

/* Scrollbar hide on WebKit */
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }

/* Global button reset */
button {
  font-family: var(--font);
  cursor: pointer;
}

/* Global input reset */
input, select, textarea {
  font-family: var(--font);
}

/* Skeleton utility (global so all components can use) */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-2) 0%,
    var(--surface-1) 50%,
    var(--surface-2) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
