<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-light text-center">
    <div class="p-4 rounded shadow-sm bg-white" style="width: 400px;">
      <img
        src="https://em-content.zobj.net/source/telegram/386/waving-hand_1f44b.webp"
        loading="lazy"
        alt="Welcome"
        class="img-fluid rounded-circle mb-3"
        style="width: 150px; height: 150px;"
      />

      <h1 class="h5 mb-3 text-dark">
        {{ t("welcomeMessage") }}, {{ firstName }}!
      </h1>
      <p class="text-muted mb-4">{{ t("welcomeDescription") }}</p>

      <div v-if="loading" class="text-muted mb-3">
        ⏳ {{ t("loading") }}
      </div>
      <div v-if="errorMessage" class="text-danger mb-3">
        {{ errorMessage }}
      </div>

      <router-link
        v-if="showStartButton"
        to="/register"
        class="btn btn-primary px-4"
      >
        {{ t("start") }}
      </router-link>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted } from 'vue';
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

    const chatId        = ref(null);
    const firstName     = ref('Foydalanuvchi');
    const loading       = ref(true);
    const errorMessage  = ref('');
    const showStartButton = ref(false);

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
        // Use /user endpoint — its response includes the 'checked' field
        const response = await axios.get(`${apiLink}/user`, {
          params: { chatId: chatId.value },
          headers: getHeaders(),
        });

        const userData = response.data?.data;
        if (!userData) {
          showStartButton.value = true;
          return;
        }

        if (isUserChecked(userData)) {
          setUser(userData);
          routeByRole(userData.role);
        } else if (userData.checked === 0 || userData.checked === false || userData.checked === '0' || userData.checked === 'false') {
          router.push('/sent');
        } else {
          showStartButton.value = true;
        }
      } catch (error) {
        const status = error.response?.status ?? error.status;
        if (status === 400) {
          // User does not exist yet — show onboarding
          errorMessage.value = '';
          showStartButton.value = true;
        } else {
          errorMessage.value = t('serverError');
        }
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        if (tg.initDataUnsafe?.user) {
          chatId.value = tg.initDataUnsafe.user.id;
          firstName.value = tg.initDataUnsafe.user.first_name || t('defaultUser');
          checkUser();
        } else {
          errorMessage.value = t('userNotFound');
          loading.value = false;
          showStartButton.value = true;
        }
      } else {
        // Dev mode outside Telegram
        errorMessage.value = t('notTelegramEnvironment');
        loading.value = false;
        showStartButton.value = true;
      }
    });

    return { firstName, loading, errorMessage, showStartButton, t };
  },
};
</script>

<style scoped>
.img-fluid { max-width: 100%; height: auto; }
h1 { font-size: 1.25rem; font-weight: 600; }
p { font-size: 0.9rem; }
.bg-light { background-color: #f8f9fa !important; }
.shadow-sm { box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075) !important; }
</style>
