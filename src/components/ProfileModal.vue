<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div
      class="modal-sheet"
      :style="{ transform: `translateY(${dragY}px)`, transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.32,0.72,0,1)' }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <div class="drag-handle" />
      <button class="close-btn" @click="$emit('close')" aria-label="Ёпиш">✕</button>

      <!-- Skeleton -->
      <div v-if="loading" class="sk-block">
        <div class="sk" style="width:80px;height:80px;border-radius:50%;margin:0 auto 14px" />
        <div class="sk" style="width:160px;height:22px;border-radius:8px;margin:0 auto 8px" />
        <div class="sk" style="width:100px;height:18px;border-radius:8px;margin:0 auto 28px" />
        <div v-for="i in 4" :key="i" class="sk info-sk" />
        <div class="sk" style="height:52px;border-radius:14px;margin-top:20px" />
      </div>

      <!-- Content -->
      <div v-else class="modal-body">
        <div class="big-avatar">{{ initials }}</div>
        <div class="user-name">{{ user.fullName || '—' }}</div>
        <div class="role-chip">{{ user.role || '—' }}</div>

        <div class="info-list">
          <div class="info-row">
            <span class="info-icon">🏢</span>
            <div>
              <div class="info-label">{{ t('organization') }}</div>
              <div class="info-value">{{ user.organization || '—' }}</div>
            </div>
          </div>
          <div class="info-row">
            <span class="info-icon">📍</span>
            <div>
              <div class="info-label">{{ t('subsection') }}</div>
              <div class="info-value">{{ user.subsection || '—' }}</div>
            </div>
          </div>
          <div class="info-row">
            <span class="info-icon">💵</span>
            <div>
              <div class="info-label">{{ t('cashRegister') }}</div>
              <div class="info-value">{{ user.cashRegister || '—' }}</div>
            </div>
          </div>
          <div class="info-row">
            <span class="info-icon">💰</span>
            <div>
              <div class="info-label">{{ t('balance') }}</div>
              <div class="info-value balance-val">{{ formatBalance(user.cashRegisterBalance) }}</div>
            </div>
          </div>
        </div>

        <!-- Language switcher -->
        <div class="section-label">{{ t('language') }}</div>
        <div class="lang-seg">
          <button
            class="lang-btn"
            :class="{ active: currentLang === 'uzbek-crylic' }"
            @click="switchLang('uzbek-crylic')"
          >{{ t('languageUz') }}</button>
          <button
            class="lang-btn"
            :class="{ active: currentLang === 'russian' }"
            @click="switchLang('russian')"
          >{{ t('languageRu') }}</button>
        </div>

        <!-- Theme note -->
        <div class="theme-note">
          🌙 {{ t('themeNote') }}
        </div>

        <button class="edit-btn" @click="goEdit">{{ t('edit') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import apiLink from '@/config/api';
import { useCurrentUser } from '@/composables/useCurrentUser';
import i18n, { LANG_STORAGE_KEY } from '@/i18n';

const emit   = defineEmits(['close']);
const router = useRouter();
const { t }  = useI18n();
const { state } = useCurrentUser();

const user       = ref({});
const loading    = ref(true);
const dragY      = ref(0);
const isDragging = ref(false);
let   startY = 0;

const currentLang = ref(localStorage.getItem(LANG_STORAGE_KEY) || 'uzbek-crylic');

function switchLang(lang) {
  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  currentLang.value = lang;
  i18n.global.locale.value = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}

const initials = computed(() => {
  const n = user.value.fullName || '';
  if (!n) return '?';
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
});

function formatBalance(v) {
  if (v == null || isNaN(v)) return '—';
  return Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум';
}

function onTouchStart(e) {
  startY = e.touches[0].clientY;
  isDragging.value = true;
}
function onTouchMove(e) {
  const dy = e.touches[0].clientY - startY;
  if (dy > 0) dragY.value = dy;
}
function onTouchEnd() {
  isDragging.value = false;
  if (dragY.value > 100) {
    emit('close');
  } else {
    dragY.value = 0;
  }
}

function goEdit() {
  emit('close');
  router.push('/profileEdit');
}

onMounted(async () => {
  // Use singleton data if already loaded
  if (state.loaded && state.fullName) {
    user.value = {
      fullName:            state.fullName,
      role:                state.role,
      organization:        state.organization,
      subsection:          state.subsection,
      cashRegister:        state.cashRegister,
      cashRegisterBalance: state.cashRegisterBalance,
    };
    loading.value = false;
    return;
  }
  // Otherwise fetch
  try {
    const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const res = await axios.get(`${apiLink}/user`, {
      params: { chatId },
      headers: {
        Authorization: 'Basic ' + btoa('admin:57325732'),
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });
    const d = res.data?.data ?? {};
    user.value = {
      fullName:            d.fullName            ?? '',
      role:                d.role                ?? '',
      organization:        d.organization        ?? '',
      subsection:          d.subsection          ?? '',
      cashRegister:        d.cashRegister        ?? '',
      cashRegisterBalance: d.cashRegisterBalance ?? 0,
    };
  } catch {
    user.value = { fullName: state.fullName ?? '', role: state.role ?? '' };
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  background: var(--surface-1);
  border-radius: 24px 24px 0 0;
  max-height: 92dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 20px calc(20px + var(--sab));
  position: relative;
  will-change: transform;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
}

.drag-handle {
  width: 36px; height: 4px;
  border-radius: 2px;
  background: var(--text-secondary);
  opacity: 0.25;
  margin: 0 auto 16px;
}

.close-btn {
  position: absolute;
  top: 16px; right: 16px;
  width: 30px; height: 30px;
  border: none;
  background: var(--surface-2);
  border-radius: 50%;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

/* Skeleton */
.sk-block { padding-top: 8px; }
.sk {
  background: linear-gradient(90deg, var(--surface-2) 0%, var(--surface-1) 50%, var(--surface-2) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.info-sk { height: 60px; border-radius: 14px; margin-bottom: 10px; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Content */
.modal-body { padding-top: 8px; }

.big-avatar {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: #16A34A;
  color: #fff;
  font-size: 28px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
}

.user-name {
  font-size: 22px; font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 8px;
}

.role-chip {
  display: block;
  text-align: center;
  padding: 5px 14px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 13px; font-weight: 600;
  width: fit-content;
  margin: 0 auto 24px;
}

.info-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

.info-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface-2);
  padding: 14px 16px;
  border-radius: 14px;
}

.info-icon { font-size: 20px; flex-shrink: 0; }

.info-label {
  font-size: 11px; font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.info-value {
  font-size: 15px; font-weight: 600;
  color: var(--text-primary);
}

.balance-val {
  color: #16A34A;
  font-variant-numeric: tabular-nums;
}

.section-label {
  font-size: 12px; font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 8px; margin-top: 4px;
}

.lang-seg {
  display: flex; background: var(--surface-2);
  border-radius: 12px; padding: 4px; gap: 3px;
  margin-bottom: 12px;
}
.lang-btn {
  flex: 1; height: 44px; border: none; border-radius: 8px;
  background: transparent; color: var(--text-secondary);
  font-size: 14px; font-weight: 500; cursor: pointer;
  font-family: var(--font);
  transition: all 180ms ease;
}
.lang-btn.active {
  background: var(--surface-1); color: var(--text-primary);
  font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.theme-note {
  font-size: 12px; color: var(--text-secondary);
  text-align: center; padding: 8px 0 16px;
  opacity: 0.75;
}

.edit-btn {
  width: 100%; height: 52px;
  background: var(--surface-2);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  font-size: 16px; font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.edit-btn:active { transform: scale(0.97); }
</style>
