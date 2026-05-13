<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
    <div class="card shadow-lg p-4 mx-3" style="width: 100%; max-width: 600px;">
      <h1 class="text-center mb-4">{{ $t("title") }}</h1>

      <!-- Hujjat turi -->
      <div class="mb-3">
        <label for="documentType" class="form-label">{{ $t("documentType") }}</label>
        <select id="documentType" class="form-select" v-model="documentType">
          <option :value="'Расход'">{{ $t("expense") }}</option>
          <option :value="'Приход'">{{ $t("income") }}</option>
          <option :value="'Перемещение'">{{ $t("transfer") }}</option>
        </select>
      </div>

      <!-- Operatsiya turi -->
      <div v-if="operations.length" class="mb-3">
        <label for="operation" class="form-label">{{ $t("operationType") }}</label>
        <select id="operation" class="form-select" v-model="operation" @change="fetchActionTypes">
          <option v-for="op in operations" :key="op" :value="op">{{ op }}</option>
        </select>
      </div>

      <!-- Harakat turi -->
      <div v-if="actionTypes.length" class="mb-3">
        <label for="actionType" class="form-label">{{ $t("actionType") }}</label>
        <select id="actionType" class="form-select" v-model="actionType" @change="fetchNestedActionTypes">
          <option v-for="type in actionTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>

      <!-- Nested Harakat turi -->
      <div v-if="nestedActionTypes.length" class="mb-3">
        <select id="nestedActionType" class="form-select" v-model="nestedActionType" @change="fetchNestedActionType">
          <option v-for="type in nestedActionTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>
      
      <!-- Bo'lim -->
      <div v-if="userRole === 'AUP'" class="mb-3">
        <label for="subsection" class="form-label">{{ $t("subsection") }}</label>
        <select id="subsection" class="form-select" v-model="subsection">
          <option v-for="sub in subsections" :key="sub.name" :value="sub.name">{{ sub.name }}</option>
        </select>
      </div>
      
      <!-- Kassa -->
      <div v-if="userRole === 'AUP' || documentType === 'Перемещение'" class="mb-3">
        <label for="cashRegister" class="form-label">{{ $t("cashRegister") }}</label>
        <select id="cashRegister" class="form-select" v-model="cashRegister">
          <option v-for="register in cashRegisters" :key="register" :value="register.cashregisterName">{{ register.cashregisterName }}</option>
        </select>
      </div>

      <!-- Operatsiya summasi -->
      <div class="mb-3">
        <label for="sum" class="form-label">{{ $t("operationSum") }}</label>
        <input
          type="text"
          id="sum"
          class="form-control"
          v-model="formattedSum"
          @input="formatSum"
          :placeholder="$t('enterComment')"
        />
      </div>

      <!-- Valyuta turi -->
      <div class="mb-3">
        <label class="form-label">{{ $t("currencyType") }}</label>
        <div class="form-check">
          <input type="radio" id="currencyUSD" class="form-check-input" value="USD" v-model="currencyType">
          <label for="currencyUSD" class="form-check-label">{{ $t("usd") }}</label>
        </div>
        <div class="form-check">
          <input type="radio" id="currencyUZS" class="form-check-input" value="UZS" v-model="currencyType">
          <label for="currencyUZS" class="form-check-label">{{ $t("uzs") }}</label>
        </div>
      </div>

      <!-- Izoh -->
      <div class="mb-3">
        <label for="comment" class="form-label">{{ $t("comment") }}</label>
        <textarea id="comment" class="form-control" v-model="comment" rows="3" :placeholder="$t('enterComment')"></textarea>
      </div>

      <!-- Tugmalar -->
      <div class="d-flex justify-content-between">
        <button @click="backToDocuments" class="btn btn-secondary">
          <i class="bi bi-arrow-left-circle m-2"></i>{{ $t("back") }}
        </button>
        <button @click="submitDocument" class="btn btn-primary">
          <i class="bi bi-check-circle m-2"></i>{{ $t("submit") }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal for success or error messages -->
  <div v-if="showErrModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5);">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">{{ modalMessage }}</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <p>{{ modalMessage }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="closeModal">{{ $t("close") }}</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showSccModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5);">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">{{ modalMessage }}</h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <p>{{ modalMessage }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="closeModal">{{ $t("close") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import axios from 'axios';
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import apiLink from "@/config/api";



export default {
  name: 'DocumentCreate',
  setup() {
    const router = useRouter();


    const documentType = ref('');
    const operations = ref([]);
    const operation = ref('');
    const actionTypes = ref([]);
    const actionType = ref('');
    const nestedActionTypes = ref([]);
    const nestedActionType = ref('');
    const toCashRegister = ref('');
    const sum = ref(0); // Asl summa qiymati
    const formattedSum = ref(""); // Formatlangan summa
    const currencyType = ref('');
    const comment = ref('');
    const userRole = ref('');
    const userOrg = ref('');
    const subsection = ref('');
    const cashRegister = ref('');
    const subsections = ref([]);
    const cashRegisters = ref([]);
    const showErrModal = ref(false); // Modalni ko'rsatish uchun
    const showSccModal = ref(false); // Modalni ko'rsatish uchun
    const modalMessage = ref(""); // Modal xabari
    const isReady = ref(false)



    const getHeaders = () => ({
      "Authorization": "Basic " + btoa("admin:57325732"),
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    });

    const fetchUserRole = async () => {
      try {
        const response = await axios.get(`${apiLink}/user?chatId=${Telegram.WebApp.initDataUnsafe.user}`, {
          headers: getHeaders()
        });
        userRole.value = response.data.data.role;
        userOrg.value = response.data.data.organization;
        if (userRole.value === 'AUP') {
          await fetchSubsections(userOrg.value);
          await fetchCashRegisters();
        }
      } catch (error) {
        console.error("Foydalanuvchi rolini olishda xatolik: ", error);
      }
    };

    const fetchSubsections = async (userOrg) => {
      try {
        const response = await axios.get(`${apiLink}/subsection?organizationName=${userOrg}`, {
          headers: getHeaders()
        });
        subsections.value = response.data.data;
      } catch (error) {
        console.error("Subsectionlarni olishda xatolik: ", error);
      }
    };

    const fetchCashRegisters = async () => {
      try {
        const response = await axios.get(`${apiLink}/cashregister`, {
          headers: getHeaders()
        });
        cashRegisters.value = response.data.data;
        console.log("Cash Registers:", cashRegisters.value);
      } catch (error) {
        console.error("Cash registerlarni olishda xatolik: ", error);
      }
    };

    const fetchOperations = () => {
      if (documentType.value === "Расход" ) {
        operations.value = ["На расходы", "Поставщику", "Инвестиции"];
      } else {
        operations.value = [];
        actionTypes.value = [];
      }
    };

    const fetchActionTypes = async () => {
      await fetchActionTypeByOrganization();
    };

    const fetchNestedActionTypes = async () => {
      await fetchActionTypeByActionTypeName(actionType.value);
    };
    const fetchNestedActionType = async () => {
      await fetchActionTypeByActionTypeName(nestedActionType.value);
    };

    const fetchActionTypeByOrganization = async () => {
      try {
        if (operation.value) {
          const response = await axios.get(`${apiLink}/actionType?operationName=${operation.value}`, {
            headers: getHeaders()
          });

          actionTypes.value = response.data.data || [];
          console.log("ActionType by Organization:", actionTypes.value);
        } else {
          console.warn("Operatsiya tanlanmagan!");
          actionTypes.value = [];
        }
      } catch (error) {
        console.error("ActionType by Organization olishda xatolik:", error);
      }
    };

    const fetchActionTypeByActionTypeName = async (actionTypeName) => {
      try {
        if (!actionTypeName) {
          nestedActionTypes.value = [];
          return;
        }

        let response;
        let isNewData = false;

        do {
          response = await axios.get(`${apiLink}/actionType?actionTypeName=${actionTypeName}`, {
            headers: getHeaders(),
            validateStatus: (status) => status >= 200 && status < 400,
          });

          if (response.status === 304) {
            console.log("Yangi ActionType mavjud emas (304 Not Modified).");
            isNewData = false;
          } else {
            nestedActionTypes.value = response.data.data || [];
            isNewData = true;
          }
        } while (!isNewData);

        console.log("Yangi ActionType yaratildi yoki mavjud:", nestedActionTypes.value);
      } catch (error) {
        console.error("ActionType by ActionTypeName olishda xatolik:", error);
      }
    };

    // Summani formatlash funksiyasi
    const formatSum = (event) => {
      const input = event.target.value.replace(/\D/g, ""); // Faqat raqamlar
      sum.value = parseInt(input, 10) || 0;
      formattedSum.value = input.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    const submitDocument = async () => {
      try {
        const payload = {
          documentType: documentType.value || "",
          chatId: window.Telegram.WebApp.initDataUnsafe.user.id || "",
          operation: operation.value || "",
          actionType: operation.value === "На расходы" ? (nestedActionType.value || "") : (actionType.value || ""),
          toCashRegister: documentType.value === 'Перемещение' ? (cashRegister.value || "") : "",
          sum: parseFloat(sum.value) || 0,
          currencyType: currencyType.value || "UZS",
          comment: comment.value || "",
          subsection: userRole.value === 'AUP' ? (subsection.value || "") : "",
          cashRegister: userRole.value === 'AUP' ? (cashRegister.value || "") : "",
        };

        await axios.post(`${apiLink}/document`, payload, {
          headers: getHeaders()
        });

        modalMessage.value = "Hujjat muvaffaqiyatli jo'natildi!";
        showSccModal.value = true;
      } catch (error) {
        modalMessage.value = "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.";
        showErrModal.value = true;
        console.error("Xatolik yuz berdi: ", error);
      }
    };

    const backToDocuments = () => {
      router.go(-1);
    };

    const closeModal = () => {
      showErrModal.value = false;
      showSccModal.value = false;
      router.push('/documents'); // Modal yopilganda hujjatlar sahifasiga qaytish
    };

    watch(documentType, (newVal) => {
      if (newVal === 'Расход') {
        fetchOperations();
      } else {
        actionTypes.value = [];
        operations.value = [];
        nestedActionTypes.value = [];
      }

      if (newVal === 'Перемещение') {
        fetchCashRegisters();
      }
    });

    onMounted(async () => {
      try {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          await fetchUserRole();
          await fetchSubsections();
        } else {
          console.warn('Running in non-Telegram environment'); // Default value for testing
        }
        isReady.value = true;
      } catch (error) {
        console.error('Initialization failed:', error);
        isReady.value = true; // Show UI anyway
      }

      try {
    const response = await axios.get(`${apiLink}/user?chatId=${Telegram.WebApp.initDataUnsafe.user.id}`, {
      headers: {
        "Authorization": "Basic " + btoa("admin:57325732"),
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    // Javobni tekshirish
    if (response && response.data && response.data.data) {
      const userLanguage = response.data.data.language; // Masalan: 'uzbek-crylic' yoki 'russian'
      if (userLanguage === "uzbek-crylic" || userLanguage === "russian") {
        i18n.global.locale.value = userLanguage; // Tilni yangilash
      } else {
        console.warn("API javobida noma'lum til:", userLanguage);
        i18n.global.locale.value = "russian"; // Default til
      }
    } else {
      console.warn("API javobida kutilgan ma'lumot mavjud emas.");
      i18n.global.locale.value = "russian"; // Default til
    }
  } catch (error) {
    console.error("Tilni olishda xatolik:", error.response ? error.response.data : error.message);
    i18n.global.locale.value = "russian"; // Default til
  }
    });

    return {
      documentType,
      operations,
      operation,
      actionTypes,
      actionType,
      nestedActionTypes,
      nestedActionType,
      toCashRegister,
      sum,
      formattedSum,
      currencyType,
      comment,
      userRole,
      subsection,
      cashRegister,
      subsections,
      cashRegisters,
      showErrModal,
      showSccModal,
      modalMessage,
      submitDocument,
      closeModal,
      fetchActionTypes,
      fetchNestedActionTypes,
      backToDocuments,
      fetchNestedActionType,
      formatSum
    };
  }
};
</script>

<style scoped>
/* Qo'shimcha uslublar */
.card {
  border-radius: 10px;
}

@media (max-width: 576px) {
  .card {
    margin: 0 15px; /* Mobil qurilmalarda ikki chetda bo'sh joy */
  }
}
</style>
