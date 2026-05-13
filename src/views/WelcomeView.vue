<template>
  <div class="welcome-page">
    <div class="welcome-card">
      <!-- Wave emoji -->
      <div class="wave-wrap" :class="{ visible: show[0] }">
        <span class="wave-emoji">👋</span>
      </div>

      <!-- Greeting -->
      <h1 class="greeting" :class="{ visible: show[1] }">
        {{ t("welcomeMessage") }}, <span class="name">{{ firstName }}</span>!
      </h1>

      <!-- Subtitle -->
      <p class="subtitle" :class="{ visible: show[2] }">
        {{ t("welcomeDescription") }}
      </p>

      <!-- Loading state -->
      <div v-if="loading" class="status-row" :class="{ visible: show[3] }">
        <div class="loading-dots">
          <span /><span /><span />
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="error-msg" :class="{ visible: show[3] }">
        {{ errorMessage }}
      </div>

      <!-- Start button -->
      <router-link
        v-if="showStartButton"
        to="/register"
        class="start-btn"
        :class="{ visible: show[3] }"
        @click="haptic"
      >
        {{ t("start") }}
      </router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import apiLink from '@/config/api';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { canAccessCash, canAccessAnalytics } from '@/utils/permissions';
import { isUserChecked } from '@/utils/user';

export default {
  name: 'WelcomeView',
  setup() {
    const router = useRouter();
    const { t } = useI18n();
    const { setUser } = useCurrentUser();

    const chatId          = ref(null);
    const firstName       = ref('');
    const loading         = ref(true);
    const errorMessage    = ref('');
    const showStartButton = ref(false);

    // Stagger animation state
    const show = ref([false, false, false, false]);
    function stagger() {
      [0, 1, 2, 3].forEach((i) => {
        setTimeout(() => { show.value[i] = true; }, 120 + i * 120);
      });
    }

    const getHeaders = () => ({
      Authorization: 'Basic ' + btoa('admin:57325732'),
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    });

    function routeByRole(role) {
      if (canAccessCash(role))      return router.push('/app/moliya');
      if (canAccessAnalytics(role)) return router.push('/app/savdo');
      return router.push('/app/moliya');
    }

    const checkUser = async () => {
      try {
        const res = await axios.get(`${apiLink}/user`, {
          params: { chatId: chatId.value },
          headers: getHeaders(),
        });
        const userData = res.data?.data;
        if (!userData) { showStartButton.value = true; return; }

        if (isUserChecked(userData)) {
          setUser(userData);
          routeByRole(userData.role);
        } else if (
          userData.checked === 0 || userData.checked === false ||
          userData.checked === '0' || userData.checked === 'false'
        ) {
          router.push('/sent');
        } else {
          showStartButton.value = true;
        }
      } catch (err) {
        const status = err.response?.status ?? err.status;
        if (status === 400) {
          showStartButton.value = true;
        } else {
          errorMessage.value = t('serverError');
        }
      } finally {
        loading.value = false;
      }
    };

    function haptic() {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    }

    onMounted(() => {
      stagger();
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
          chatId.value  = tg.initDataUnsafe.user.id;
          firstName.value = tg.initDataUnsafe.user.first_name || t('defaultUser');
          checkUser();
        } else {
          errorMessage.value = t('userNotFound');
          loading.value      = false;
          showStartButton.value = true;
        }
      } else {
        firstName.value       = t('defaultUser');
        errorMessage.value    = t('notTelegramEnvironment');
        loading.value         = false;
        showStartButton.value = true;
      }
    });

    return { firstName, loading, errorMessage, showStartButton, show, haptic, t };
  },
};
</script>

<style scoped>
.welcome-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 24px 20px;
  background: var(--surface-1);
}

.welcome-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 360px;
  gap: 0;
}

/* Shared fade-in */
.wave-wrap, .greeting, .subtitle, .status-row, .error-msg, .start-btn {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 400ms ease, transform 400ms ease;
}
.wave-wrap.visible, .greeting.visible, .subtitle.visible,
.status-row.visible, .error-msg.visible, .start-btn.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Wave emoji */
.wave-wrap {
  margin-bottom: 20px;
}
@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  20%       { transform: rotate(20deg); }
  40%       { transform: rotate(-8deg); }
  60%       { transform: rotate(16deg); }
  80%       { transform: rotate(-4deg); }
}
.wave-emoji {
  font-size: 72px;
  display: inline-block;
  animation: wave 2.5s ease-in-out 0.6s 1;
  transform-origin: 70% 80%;
}

/* Greeting */
.greeting {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin-bottom: 10px;
}
.name { color: var(--brand-500); }

/* Subtitle */
.subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 36px;
  line-height: 1.5;
}

/* Loading dots */
.status-row { margin-bottom: 24px; }
.loading-dots {
  display: flex; gap: 6px; justify-content: center;
}
.loading-dots span {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--brand-500);
  animation: bounce 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%            { transform: scale(1);   opacity: 1; }
}

/* Error */
.error-msg {
  font-size: 14px;
  color: var(--status-error-fg, #B91C1C);
  background: var(--status-error-bg, #FEE2E2);
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  width: 100%;
}

/* Start button */
.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, var(--gradient-start, #2563EB), var(--gradient-end, #6B21A8));
  color: #fff;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.start-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}
</style>
