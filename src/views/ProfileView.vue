<template>
  <div class="container mt-5">
    <h1 class="text-center mb-4">{{ t("profileTitle") }}</h1>
      <!-- Profile Header -->
      <div class="card shadow-lg p-4 text-center mb-4">
        <img :src="profileImage" alt="User Avatar" class="rounded-circle mx-auto mb-3" style="width: 80px; height: 80px;" />
        <h1 class="h5">{{ user.fullName }}</h1>
        <p class="text-muted">{{ user.role }}</p>
      </div>

      <!-- Profile Details -->
      <div class="card shadow-lg p-4">

        <h2 class="h6 text-uppercase text-muted">{{ t("organization") }}</h2>
        <p class="mb-3">{{ user.organization }}</p>

        <h2 class="h6 text-uppercase text-muted">{{ t("subsection") }}</h2>
        <p class="mb-3">{{ user.subsection }}</p>

        <h2 class="h6 text-uppercase text-muted">{{ t("cashRegister") }}</h2>
        <p class="mb-3">{{ user.cashRegister }}</p>

        <h2 class="h6 text-uppercase text-muted"><i class="bi bi-cash-coin"></i>  {{ t("balance") }}</h2>
        <p class="mb-3">{{ formatNumber(user.cashRegisterBalance) }}</p>
      </div>

      <!-- Edit Button -->
      <div class="d-flex justify-content-between mt-4 mb-4">
        <button class="btn btn-secondary" @click="$router.push('/documents')">
          <i class="bi bi-arrow-left-circle m-2"></i>{{ t("back") }}
        </button>
        <button class="btn btn-primary" @click="$router.push('/profileedit')">
          <i class="bi bi-pencil m-2"></i>{{ t("edit") }}
        </button>
      </div>
    </div>
</template>

<script>
import { ref, onMounted } from "vue";
import axios from "axios";
import apiLink from "@/config/api";
import { useI18n } from "vue-i18n";

export default {
  name: "ProfileView",
  setup() {
    const { t } = useI18n();
    const user = ref({
      fullName: t("loading"),
      language: t("loading"),
      organization: t("loading"),
      subsection: t("loading"),
      cashRegister: t("loading"),
      role: t("loading"),
      cashRegisterBalance: t("loading"),
    });

    const profileImage = ref("../assets/pics/profile.png");
    const chatId = ref(null);

    const formatNumber = (value) => {
      if (!value || isNaN(value)) return value;
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    onMounted(async () => {
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          const telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
          chatId.value = telegramUser?.id || null;
          profileImage.value = telegramUser?.photo_url || "./assets/img/default-avatar.jpg";
        }

        const response = await axios.get(`${apiLink}/user`, {
          params: { chatId: chatId.value },
          headers: getHeaders(),
        });

        const data = response.data.data;

        user.value = {
          fullName: data.fullName || t("unknown"),
          language: data.language || t("unknown"),
          organization: data.organization || t("unknown"),
          subsection: data.subsection || t("unknown"),
          cashRegister: data.cashRegister || t("unknown"),
          role: data.role || t("unknown"),
          cashRegisterBalance: data.cashRegisterBalance || t("unknown"),
        };
      } catch (error) {
        console.error("API orqali ma'lumotlarni olishda xatolik:", error);
      }
    });

    function getHeaders() {
      return {
        Authorization: "Basic " + btoa("admin:57325732"),
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      };
    }

    return {
      user,
      profileImage,
      t,
      formatNumber
    };
  },
};
</script>

<style scoped>
.container {
  max-width: 600px;
}

.card {
  border-radius: 10px;
}

.card h1 {
  font-size: 1.25rem;
}

.card p {
  font-size: 0.9rem;
  color: #6c757d;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
}

.btn-primary:hover {
  background-color: #0056b3;
  border-color: #004085;
}
</style>