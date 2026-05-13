<template>
  <div class="container mt-2">
    <nav class="navbar navbar-light bg-light shadow-sm mb-4">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1 d-flex flex-column">
          <span>{{ userName }}</span>
          <small class="text-muted">{{ userSubsection }}</small>
        </span>
        <RouterLink to="/profile" class="d-flex align-items-center">
          <img :src="profileImage" alt="Profile" class="rounded-circle" style="width: 40px; height: 40px;" />
        </RouterLink>
      </div>
    </nav>

    <h1 class="text-center mb-4">📂 {{ t("documentsTitle") }}</h1>

    <!-- Today's online sales summary — only for analytics-enabled roles -->
    <TodaySalesCard v-if="canAccessAnalytics()" />

    <div v-if="loading" class="text-center text-warning">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">{{ t("loading") }}</span>
      </div>
      <p class="mt-2">⏳ {{ t("loading") }}</p>
    </div>

    <div v-if="errorMessage" class="alert alert-danger text-center">
      {{ errorMessage }}
    </div>

    <div v-else>
      <ul class="list-group">
        <li v-for="doc in documents" :key="doc.chatId" class="list-group-item">
          <h5 class="mb-1">{{ t(doc.documentType) }}</h5>
          <p class="mb-1"><strong>{{ t("sum") }}:</strong> {{ formatNumber(doc.sum) }} {{ doc.currencyType }}</p>
          <p class="mb-1"><strong>{{ t("operation") }}:</strong> {{ doc.operation }} - {{ doc.actionType }}</p>
          <p class="mb-1"><strong>{{ t("organization") }}:</strong> {{ doc.organization }}</p>
          <p class="mb-1"><strong>{{ t("additionalInfo") }}:</strong> {{ doc.comment || t("notAvailable") }}</p>
        </li>
      </ul>
    </div>

    <div class="text-center">
      <RouterLink to="/addDocument" class="btn btn-primary text-center" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      font-size: 24px;
      padding: 5px 0 5px 0;
      "><i class="bi bi-file-earmark-plus m-2"></i></RouterLink>
    </div>
    <BottomBar />
  </div>
</template>

<script>
import apiLink from "@/config/api";
import axios from "axios";
import { ref, onMounted } from "vue";
import { RouterLink, useRouter } from "vue-router";
import BottomBar from '@/components/BottomBar.vue';
import TodaySalesCard from '@/components/TodaySalesCard.vue';
import { useI18n } from "vue-i18n";
import { useCurrentUser } from "@/composables/useCurrentUser";

const formatNumber = (value) => {
  if (!value) return "0";
  return new Intl.NumberFormat("uz-UZ").format(value);
};

export default {
  name: "DocumentsView",
  components: { BottomBar, TodaySalesCard },
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const { setUser, canAccessAnalytics } = useCurrentUser();
    const documents = ref([]);
    const loading = ref(true);
    const errorMessage = ref("");
    const chatId = ref(null);
    const profileImage = ref("./assets/img/profile.jpg");
    const userName = ref(t("defaultUser"));
    const userSubsection = ref(t("defaultSubsection"));

    onMounted(() => {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          chatId.value = tg.initDataUnsafe.user.id;
          if (tg.initDataUnsafe.user.photo_url) {
            profileImage.value = tg.initDataUnsafe.user.photo_url;
          }
        }
      }
      if (chatId.value) {
        fetchUserProfile();
        fetchDocuments();
      } else {
        errorMessage.value = t("userNotFound");
        loading.value = false;
      }
    });

    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(`${apiLink}/user`, {
          params: { chatId: chatId.value },
          headers: {
            Authorization: "Basic " + btoa("admin:57325732"),
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (response.data) {
          const userData = response.data.data;
          userName.value = userData.fullName || t("defaultUser");
          userSubsection.value = userData.subsection || t("defaultSubsection");
          setUser(userData);
        }
      } catch (error) {
        console.error("Foydalanuvchi ma'lumotlarini olishda xatolik:", error);
      }
    };

    const fetchDocuments = async () => {
      try {
        const response = await axios.get(`${apiLink}/document`, {
          params: { chatId: chatId.value },
          headers: {
            Authorization: "Basic " + btoa("admin:57325732"),
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (response.data && response.data.Code === "200") {
          documents.value = response.data.message;
        } else {
          errorMessage.value = t("documentsNotFound");
        }
      } catch (error) {
        if (error.status === 404) {
          errorMessage.value = t("documentsNotFound");
        } else if (error.response && error.response.status === 500) {
          errorMessage.value = t("serverError");
        } else if (error.response && error.response.status === 401) {
          errorMessage.value = t("noAccess");
        } else {
          errorMessage.value = t("connectionError");
        }
        console.log("Xatolik yuz berdi:", error);
      } finally {
        loading.value = false;
      }
    };

    return {
      documents,
      loading,
      errorMessage,
      profileImage,
      userName,
      userSubsection,
      formatNumber,
      canAccessAnalytics,
      t,
    };
  },
};
</script>

<style scoped>
.container {
  max-width: 800px;
}

.navbar-brand small {
  font-size: 0.8rem;
}

.list-group-item {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  margin-bottom: 10px;
}

.list-group-item h5 {
  color: #343a40;
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