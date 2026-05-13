<template>
  <div class="app-layout">
    <!-- ═══ HEADER ═══ -->
    <header class="app-header">
      <div class="header-left">
        <div class="greeting-line">
          {{ greeting }}, <strong>{{ firstName }}</strong>!
        </div>
        <div v-if="subsectionText" class="subsection-line">{{ subsectionText }}</div>
      </div>
      <div class="header-actions">
        <button class="theme-btn" @click="toggleTheme" :aria-label="isDark ? 'Кундузги режим' : 'Тунги режим'">
          <!-- Moon (light mode → switch to dark) -->
          <svg v-if="!isDark" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <!-- Sun (dark mode → switch to light) -->
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </button>
        <button class="avatar-btn" @click="openProfile" aria-label="Профилни очиш">
          <div class="avatar-circle">{{ initials }}</div>
        </button>
      </div>
    </header>

    <!-- ═══ CONTENT ═══ -->
    <main class="app-content">
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <!-- ═══ BOTTOM BAR ═══ -->
    <BottomBar />

    <!-- ═══ PROFILE MODAL ═══ -->
    <Transition name="backdrop-fade">
      <ProfileModal v-if="profileOpen" @close="closeProfile" />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BottomBar from '@/components/BottomBar.vue';
import ProfileModal from '@/components/ProfileModal.vue';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useTheme } from '@/composables/useTheme';

const { t } = useI18n();
const { isDark, toggleTheme } = useTheme();
const { state } = useCurrentUser();
const route = useRoute();
const profileOpen = ref(false);
const transitionName = ref('slide-right');

const routeOrder = { '/app/moliya': 0, '/app/savdo': 1 };
watch(() => route.path, (to, from) => {
  const toIdx   = routeOrder[to]   ?? 0;
  const fromIdx = routeOrder[from] ?? 0;
  transitionName.value = toIdx > fromIdx ? 'slide-left' : 'slide-right';
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return t('greeting.morning');
  if (h >= 12 && h < 17) return t('greeting.day');
  if (h >= 17 && h < 22) return t('greeting.evening');
  return t('greeting.night');
});

const firstName = computed(() => {
  if (!state.fullName) return t('defaultUser');
  return state.fullName.split(' ')[0];
});

const subsectionText = computed(() => state.subsection || '');

const initials = computed(() => {
  const name = state.fullName;
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
});

function openProfile() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  window.Telegram?.WebApp?.BackButton?.show();
  profileOpen.value = true;
}

function closeProfile() {
  window.Telegram?.WebApp?.BackButton?.hide();
  profileOpen.value = false;
}

onMounted(() => {
  window.Telegram?.WebApp?.setHeaderColor?.('secondary_bg_color');

  const tg = window.Telegram?.WebApp;
  if (tg?.BackButton) {
    tg.BackButton.onClick(() => {
      if (profileOpen.value) closeProfile();
    });
  }
});
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--surface-1);
  font-family: var(--font);
}

/* ── Header ── */
.app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--header-h);
  background: var(--surface-2);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.greeting-line {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.2;
}
.greeting-line strong { font-weight: 700; }

.subsection-line {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 2px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

/* ── Header right actions ── */
.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ── Theme toggle ── */
.theme-btn {
  width: 40px; height: 40px;
  border: none;
  background: var(--surface-1);
  border-radius: 50%;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: transform 150ms ease, color 200ms ease;
  flex-shrink: 0;
}
.theme-btn:active { transform: scale(0.88); }

/* ── Avatar ── */
.avatar-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: transform 150ms ease;
}
.avatar-btn:active { transform: scale(0.90); }

.avatar-circle {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: #16A34A;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

/* ── Content ── */
.app-content {
  flex: 1;
  margin-top: var(--header-h);
  padding-bottom: calc(var(--bar-h) + var(--sab) + 8px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Module transitions ── */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}
.slide-left-enter-from  { opacity: 0; transform: translateX(24px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-24px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-24px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(24px); }

/* ── Backdrop fade ── */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active { transition: opacity 200ms ease; }
.backdrop-fade-enter-from,
.backdrop-fade-leave-to { opacity: 0; }
</style>
