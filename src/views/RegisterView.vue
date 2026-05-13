<template>
  <div class="container mt-5">
    <div class="card shadow-lg p-4 mx-auto" style="max-width: 600px;">
      <h1 class="text-center mb-4">{{ t("registerTitle") }}</h1>

      <!-- Profil rasmi -->
      <div class="text-center mb-4">
        <img :src="profileImg" alt="Profile Image" class="rounded-circle" style="width: 100px; height: 100px;" />
      </div>

      <!-- Ism -->
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

      <!-- Tashkilot -->
      <div class="mb-3">
        <label for="organization" class="form-label">{{ t("organization") }}</label>
        <select
          id="organization"
          class="form-select"
          v-model="selectedOrganization"
          @change="fetchSubsections"
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

      <!-- Tugma -->
      <div class="text-center mt-4">
        <button class="btn btn-primary" @click="registerUser">
          <i class="bi bi-check-circle m-2"></i>{{ t("submit") }}
        </button>
      </div>
    </div>

    <!-- Modal for success or error messages -->
    <div v-if="showModal" class="modal fade show d-block " tabindex="-1" style="background: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog-centered m-3">
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
import apiLink from "@/config/api";
import { useI18n } from "vue-i18n";

export default {
  setup() {
    const { t } = useI18n();
    return {
      t,
    };
  },
  data() {
    return {
      fullName: "",
      profileImg: "./assets/img/profile.jpg", // Default avatar
      organizations: [],
      selectedOrganization: "",
      subsections: [],
      selectedSubsection: "",
      cashRegisters: [],
      selectedCashRegister: "",
      showModal: false,
      modalMessage: "",
    };
  },
  mounted() {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();

      const user = window.Telegram.WebApp.initDataUnsafe.user;
      if (user) {
        this.fullName = user.first_name + " " + user.first_name|| "";
        this.profileImg = user.photo_url || "./assets/img/profile.jpg";
      }
    }

    this.fetchOrganizations();
    this.fetchCashRegisters();
  },
  methods: {
    async fetchOrganizations() {
      try {
        const response = await axios.get(`${apiLink}/organization`, {
          headers: this.getHeaders(),
        });
        this.organizations = response.data.data;
      } catch (error) {
        console.error("Tashkilotlarni olishda xatolik:", error);
      }
    },
    async fetchCashRegisters() {
      try {
        const response = await axios.get(`${apiLink}/cashregister`, {
          headers: this.getHeaders(),
        });
        this.cashRegisters = response.data.data;
      } catch (error) {
        console.error("Kassalarni olishda xatolik:", error);
      }
    },
    async fetchSubsections() {
      if (!this.selectedOrganization) return;
      try {
        const response = await axios.get(`${apiLink}/subsection`, {
          params: { organizationName: this.selectedOrganization.trim() },
          headers: this.getHeaders(),
          paramsSerializer: (params) => {
            return new URLSearchParams(params).toString().replace(/\+/g, "%20"); // "+" → "%20"
          },
        });
        this.subsections = response.data.data;
      } catch (error) {
        console.error("Bo'limlarni olishda xatolik:", error);
      }
    },
    async registerUser() {
      try {
        const chatId = window.Telegram.WebApp?.initDataUnsafe?.user?.id;
        const payload = {
          chatId: chatId,
          fullName: this.fullName,
          organization: this.selectedOrganization || "",
          subsection: this.selectedSubsection || "",
          cashRegister: this.selectedCashRegister || "",
        };
        await axios.post(`${apiLink}/user`, payload, {
          headers: this.getHeaders(),
        });
        this.modalMessage = "Ma'lumotlar muvaffaqiyatli jo'natildi.";
        this.showModal = true;
      } catch (error) {
        this.modalMessage = "Xatolik yuz berdi.";
        this.showModal = true;
        console.error("Ro'yxatdan o'tishda xatolik:", error);
      }
    },
    closeModal() {
      this.showModal = false;
      if (this.modalMessage === "Ma'lumotlar muvaffaqiyatli jo'natildi.") {
        this.$router.push("/sent");
      }
    },
    getHeaders() {
      return {
        Authorization: "Basic " + btoa("admin:57325732"),
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      };
    },
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
</style>
