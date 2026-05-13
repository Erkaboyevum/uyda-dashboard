<template>
  <nav class="bottom-bar">
    <button
      v-if="canAccessCash()"
      class="bar-tab"
      :class="{ active: isMoliya }"
      @click="goTo('/app/moliya')"
    >
      <!-- Money / wallet icon -->
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="2" y="7" width="20" height="13" rx="2" stroke-width="1.7"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke-width="1.7" stroke-linecap="round"/>
        <circle cx="12" cy="13.5" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
      <span class="tab-label">{{ t('tabs.moliya') }}</span>
    </button>

    <button
      v-if="canAccessAnalytics()"
      class="bar-tab"
      :class="{ active: isSavdo }"
      @click="goTo('/app/savdo')"
    >
      <!-- Bar chart icon -->
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="tab-label">{{ t('tabs.savdo') }}</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCurrentUser } from '@/composables/useCurrentUser';

const route  = useRoute();
const router = useRouter();
const { t }  = useI18n();
const { canAccessCash, canAccessAnalytics } = useCurrentUser();

const isMoliya = computed(() => route.path.startsWith('/app/moliya'));
const isSavdo  = computed(() => route.path.startsWith('/app/savdo'));

function goTo(path) {
  if (route.path === path) return;
  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  router.push(path);
}
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: calc(var(--bar-h) + var(--sab));
  padding-bottom: var(--sab);
  background: var(--surface-1);
  border-top: 1px solid var(--border-subtle);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 90;
}

.bar-tab {
  flex: 1;
  max-width: 160px;
  height: var(--bar-h);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font);
  -webkit-tap-highlight-color: transparent;
  transition: color 200ms ease;
  position: relative;
}
.bar-tab:active { transform: scale(0.94); }

.bar-tab.active { color: var(--brand-500); }

.tab-icon {
  width: 24px; height: 24px;
  transition: transform 200ms ease;
}
.bar-tab.active .tab-icon { transform: scale(1.08); }

.tab-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
  transition: font-weight 200ms ease;
}
.bar-tab.active .tab-label { font-weight: 700; }

/* Active indicator dot */
.bar-tab.active::after {
  content: '';
  position: absolute;
  bottom: 6px;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--brand-500);
}
</style>
