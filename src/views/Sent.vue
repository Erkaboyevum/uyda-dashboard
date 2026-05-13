<template>
  <div class="sent-page">
    <div class="sent-card" :class="{ visible: mounted }">
      <div class="sent-icon">⏳</div>
      <h1 class="sent-title">{{ t('pendingTitle') }}</h1>
      <p class="sent-msg">{{ t('pendingMessage') }}</p>
      <p class="sent-hint">{{ t('pendingHint') }}</p>

      <button class="refresh-btn" @click="pollNow" :disabled="polling">
        <span v-if="polling" class="spinner" />
        <span v-else>↺</span>
        {{ t('pendingRefresh') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import apiLink from '@/config/api';
import { isUserChecked } from '@/utils/user';
import { canAccessCash, canAccessAnalytics } from '@/utils/permissions';
import { useCurrentUser } from '@/composables/useCurrentUser';

const router = useRouter();
const { t }  = useI18n();
const { setUser } = useCurrentUser();

const mounted = ref(false);
const polling = ref(false);
let interval  = null;

const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;

const getHeaders = () => ({
  Authorization: 'Basic ' + btoa('admin:57325732'),
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
});

async function pollUser() {
  if (!chatId || polling.value) return;
  polling.value = true;
  try {
    const res = await axios.get(`${apiLink}/user`, {
      params: { chatId },
      headers: getHeaders(),
    });
    const data = res.data?.data;
    if (data && isUserChecked(data)) {
      setUser(data);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      const role = data.role;
      clearInterval(interval);
      if (canAccessCash(role))      router.push('/app/moliya');
      else if (canAccessAnalytics(role)) router.push('/app/savdo');
      else                               router.push('/app/moliya');
    }
  } catch { /* ignore */ } finally {
    polling.value = false;
  }
}

function pollNow() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  pollUser();
}

onMounted(() => {
  setTimeout(() => { mounted.value = true; }, 80);
  interval = setInterval(pollUser, 30_000);
});

onUnmounted(() => { clearInterval(interval); });
</script>

<style scoped>
.sent-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 32px 24px;
  background: var(--surface-1);
}

.sent-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 340px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 400ms ease, transform 400ms ease;
}
.sent-card.visible { opacity: 1; transform: none; }

.sent-icon {
  font-size: 72px;
  margin-bottom: 20px;
  animation: pulse-icon 2.5s ease-in-out infinite;
}
@keyframes pulse-icon {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%       { transform: scale(1.08); opacity: 0.85; }
}

.sent-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
  margin-bottom: 12px;
}

.sent-msg {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.sent-hint {
  font-size: 13px;
  color: var(--text-secondary);
  opacity: 0.7;
  margin-bottom: 32px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 28px;
  border: none;
  border-radius: 14px;
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border-subtle);
  transition: transform 150ms ease;
}
.refresh-btn:active:not(:disabled) { transform: scale(0.97); }
.refresh-btn:disabled { opacity: 0.5; cursor: default; }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--brand-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
