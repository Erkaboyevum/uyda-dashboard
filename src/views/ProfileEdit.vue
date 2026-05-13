<template>
  <div class="container mt-5">
    <div class="card shadow-lg p-4 mx-auto" style="max-width: 600px;">
      <h1 class="text-center mb-4">{{ t("profileEditTitle") }}</h1>

      <!-- Ism va Familiya -->
      <div class="mb-3">
        <label for="fullName" class="form-label">{{ t("fullName") }}</label>
        <input
          type="text"
          id="fullName"
          class="form-control"
          v-model="fullName"
          :placeholder="t('fullNamePlaceholder')"
        />
      </div>

      <!-- Til -->
      <div class="mb-3">
        <label for="language" class="form-label">{{ t("language") }}</label>
        <select id="language" class="form-select" v-model="language">
          <option value="uzbek-crylic">{{ t("uzbekCyrillic") }}</option>
          <option value="russian">{{ t("russian") }}</option>
        </select>
      </div>

      <!-- Tashkilot -->
      <div class="mb-3">
        <label for="organization" class="form-label">{{ t("organization") }}</label>
        <select
          id="organization"
          class="form-select"
          v-model="selectedOrganization"
          @change="fetchSubsections"
          @load="fetchSubsections"
        >
          <option value="" disabled>{{ t("selectOne") }}</option>
          <option
            v-for="org in organizations"
            :key="org.organizationName"
            :value="org.organizationName"
          >
            {{ org.organizationName }}
          </option>
        </select>
      </div>

      <!-- Bo'lim -->
      <div class="mb-3">
        <label for="subsection" class="form-label">{{ t("subsection") }}</label>
        <select
          id="subsection"
          class="form-select"
          v-model="selectedSubsection"
          :disabled="!subsections.length"
        >
          <option value="" disabled>{{ t("selectOne") }}</option>
          <option
            v-for="sub in subsections"
            :key="sub.subsectionName"
            :value="sub.subsectionName"
          >
            {{ sub.subsectionName }}
          </option>
        </select>
      </div>

      <!-- Kassa -->
      <div class="mb-3">
        <label for="cashRegister" class="form-label">{{ t("cashRegister") }}</label>
        <select
          id="cashRegister"
          class="form-select"
          v-model="selectedCashRegister"
          :disabled="!cashRegisters.length"
        >
          <option value="" disabled>{{ t("selectOne") }}</option>
          <option
            v-for="cash in cashRegisters"
            :key="cash.cashregisterName"
            :value="cash.cashregisterName"
          >
            {{ cash.cashregisterName }}
          </option>
        </select>
      </div>

      <!-- Tugmalar -->
      <div class="d-flex justify-content-between">
        <button class="btn btn-secondary" @click="backTo">
          <i class="bi bi-arrow-left-circle m-2"></i>{{ t("back") }}
        </button>
        <button class="btn btn-primary" @click="updateProfile">
          <i class="bi bi-check-circle m-2"></i>{{ t("save") }}
        </button>
      </div>
    </div>

    <!-- Modal for success or error messages -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ t("message") }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <p>{{ modalMessage }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" @click="closeModal">{{ t("close") }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import apiLink from "@/config/api";

export default {
  name: "ProfileEdit",
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const chatId = ref(null);
    const fullName = ref("");
    const checked = ref(1);
    const role = ref("");
    const selectedOrganization = ref("");
    const selectedSubsection = ref("");
    const selectedCashRegister = ref("");
    const organizations = ref([]);
    const subsections = ref([]);
    const language = ref("");
    const cashRegisters = ref([]);
    const showModal = ref(false);
    const modalMessage = ref("");

    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(`${apiLink}/user`, {
          params: { chatId: chatId.value },
          headers: getHeaders(),
        });

        const userData = response.data.data;
        fullName.value = userData.fullName || "";
        selectedOrganization.value = userData.organization || "";
        selectedSubsection.value = userData.subsection || "";
        selectedCashRegister.value = userData.cashRegister || "";
        language.value = userData.language || "uzbek-crylic";
        role.value = userData.role || "";
        checked.value = userData.checked || 1;
      } catch (error) {
        console.error("Foydalanuvchi ma'lumotlarini olishda xatolik:", error);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const response = await axios.get(`${apiLink}/organization`, {
          headers: getHeaders(),
        });
        organizations.value = response.data.data;
      } catch (error) {
        console.error("Tashkilotlarni olishda xatolik:", error);
      }
    };

    const fetchSubsections = async () => {
      if (!selectedOrganization.value) return;
      try {
        const response = await axios.get(`${apiLink}/subsection`, {
          params: { organizationName: selectedOrganization.value.trim() },
          headers: getHeaders(),
          paramsSerializer: (params) => {
            return new URLSearchParams(params).toString().replace(/\+/g, "%20");
          }
        });
        subsections.value = response.data.data;
      } catch (error) {
        console.error("Bo'limlarni olishda xatolik:", error);
      }
    };

    const fetchCashRegisters = async () => {
      try {
        const response = await axios.get(`${apiLink}/cashregister`, {
          headers: getHeaders(),
        });
        cashRegisters.value = response.data.data;
      } catch (error) {
        console.error("Kassalarni olishda xatolik:", error);
      }
    };

    const updateProfile = async () => {
      try {
        const payload = {
          chatId: String(chatId.value),
          fullName: fullName.value,
          organization: selectedOrganization.value,
          subsection: selectedSubsection.value,
          cashRegister: selectedCashRegister.value,
          language: language.value,
          role: role.value,
          checked: checked.value,
        };

        await axios.put(`${apiLink}/user`, payload, {
          headers: getHeaders(),
        });

        modalMessage.value = t("profileUpdateSuccess");
        showModal.value = true;
      } catch (error) {
        modalMessage.value = t("profileUpdateError");
        showModal.value = true;
        console.error("Profilni yangilashda xatolik:", error);
      }
    };

    const closeModal = () => {
      showModal.value = false;
      router.push("/profile");
    };

    const backTo = () => {
      router.push("/profile");
    };

    const getHeaders = () => ({
      Authorization: "Basic " + btoa("admin:57325732"),
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    });

    onMounted(() => {
      fetchOrganizations();
      fetchSubsections();
      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        chatId.value = window.Telegram.WebApp.initDataUnsafe.user.id;
        fetchUserProfile();
        fetchCashRegisters();
      } else {
        console.error("Telegram WebApp foydalanuvchisi aniqlanmadi.");
      }
    });

    return {
      t,
      chatId,
      fullName,
      selectedOrganization,
      selectedSubsection,
      selectedCashRegister,
      organizations,
      subsections,
      cashRegisters,
      language,
      showModal,
      modalMessage,
      fetchSubsections,
      updateProfile,
      closeModal,
      backTo,
    };
  },
};
</script>

<style scoped>
.card {
  border-radius: 10px;
}

.modal-content {
  border-radius: 10px;
}

.modal-header {
  background-color: #007bff;
  color: white;
}

.modal-footer {
  justify-content: center;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
}

.btn-primary:hover {
  background-color: #0056b3;
  border-color: #004085;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}
</style>