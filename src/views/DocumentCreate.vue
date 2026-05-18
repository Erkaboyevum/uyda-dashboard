<template>
  <div class="create-page">
    <!-- Back header -->
    <div class="page-header">
      <button class="back-btn" @click="backToDocuments">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <h1 class="page-title">{{ $t('title') }}</h1>
    </div>

    <div class="form-body">
      <!-- ── Document type radio cards ── -->
      <div class="field">
        <label class="field-label">{{ $t('docTypeLabel') }}</label>
        <div class="type-cards">
          <button
            v-for="type in docTypes"
            :key="type.value"
            class="type-card"
            :class="{ active: documentType === type.value }"
            @click="selectDocType(type.value)"
          >
            <span class="type-icon">{{ type.icon }}</span>
            <span class="type-label">{{ type.label }}</span>
          </button>
        </div>
      </div>

      <!-- ── Operation segmented (Расход only) ── -->
      <div v-if="documentType === 'Расход' && operations.length" class="field">
        <label class="field-label">{{ $t('operationType') }}</label>
        <div class="seg-control">
          <button
            v-for="op in operations"
            :key="op"
            class="seg-btn"
            :class="{ active: operation === op }"
            @click="selectOperation(op)"
          >{{ opLabel(op) }}</button>
        </div>
      </div>

      <!-- ── Statya (Статья) cascade ── -->
      <div v-if="actionTypes.length" class="field">
        <label class="field-label">{{ $t('actionType') }}</label>
        <div class="select-wrap">
          <select v-model="actionType" class="field-input" @change="fetchNestedActionTypes">
            <option value="" disabled>{{ $t('selectOne') }}</option>
            <option v-for="a in actionTypes" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <div v-if="nestedActionTypes.length" class="field">
        <label class="field-label">{{ $t('statyaGroup') }}</label>
        <div class="select-wrap">
          <select v-model="nestedActionType" class="field-input" @change="fetchNestedActionType">
            <option value="" disabled>{{ $t('selectOne') }}</option>
            <option v-for="a in nestedActionTypes" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <!-- ── To cash register (Перемещение) ── -->
      <div v-if="documentType === 'Перемещение'" class="field">
        <label class="field-label">{{ $t('toCashRegister') }}</label>
        <div class="select-wrap">
          <select v-model="cashRegister" class="field-input">
            <option value="" disabled>{{ $t('selectOne') }}</option>
            <option v-for="r in cashRegisters" :key="r.cashregisterName" :value="r.cashregisterName">
              {{ r.cashregisterName }}
            </option>
          </select>
        </div>
      </div>

      <!-- ── AUP fields ── -->
      <template v-if="userRole === 'AUP'">
        <div class="field">
          <label class="field-label">{{ $t('subsection') }}</label>
          <div class="select-wrap">
            <select v-model="subsection" class="field-input">
              <option v-for="s in subsections" :key="s.name" :value="s.name">{{ s.name }}</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label class="field-label">{{ $t('cashRegister') }}</label>
          <div class="select-wrap">
            <select v-model="cashRegister" class="field-input">
              <option v-for="r in cashRegisters" :key="r.cashregisterName" :value="r.cashregisterName">
                {{ r.cashregisterName }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <!-- ── Sum input ── -->
      <div class="field sum-field">
        <label class="field-label">{{ $t('sumLabel') }}</label>
        <input
          class="sum-input"
          type="text"
          inputmode="numeric"
          v-model="formattedSum"
          @input="formatSum"
          :placeholder="'0'"
        />
        <!-- Currency toggle -->
        <div class="currency-seg">
          <button
            class="curr-btn"
            :class="{ active: currencyType === 'UZS' }"
            @click="setCurrency('UZS')"
          >UZS</button>
          <button
            class="curr-btn"
            :class="{ active: currencyType === 'USD' }"
            @click="setCurrency('USD')"
          >USD</button>
        </div>
      </div>

      <!-- ── Comment ── -->
      <div class="field">
        <label class="field-label">{{ $t('comment') }}</label>
        <textarea
          v-model="comment"
          class="field-input textarea"
          rows="3"
          :placeholder="$t('enterComment')"
        />
      </div>

      <!-- Fallback submit (no MainButton) -->
      <button
        v-if="!hasTgMainButton"
        class="submit-btn"
        :disabled="submitting"
        @click="submitDocument"
      >
        <span v-if="submitting" class="spinner" />
        {{ submitting ? $t('loading') : $t('submit') }}
      </button>
    </div>

    <!-- Toast (error only) -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
    </Transition>

    <!-- Success modal -->
    <Transition name="modal-fade">
      <div v-if="successModal" class="modal-backdrop" @click.self="goToDocuments">
        <div class="modal-card">
          <div class="modal-icon-wrap">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#16A34A" fill-opacity="0.12"/>
              <circle cx="12" cy="12" r="9" fill="#16A34A" fill-opacity="0.18"/>
              <path d="M7.5 12.5l3 3 6-6" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="modal-title">Ҳужжат юборилди!</div>
          <div class="modal-sub">Ҳужжат муваффақиятли яратилди ва тизимга сақланди.</div>
          <button class="modal-btn" @click="goToDocuments">Молияга қайтиш</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import apiLink from '@/config/api';

export default {
  name: 'DocumentCreate',
  setup() {
    const router = useRouter();

    const documentType      = ref('');
    const operations        = ref([]);
    const operation         = ref('');
    const actionTypes       = ref([]);
    const actionType        = ref('');
    const nestedActionTypes = ref([]);
    const nestedActionType  = ref('');
    const cashRegister      = ref('');
    const sum               = ref(0);
    const formattedSum      = ref('');
    const currencyType      = ref('UZS');
    const comment           = ref('');
    const userRole          = ref('');
    const userOrg           = ref('');
    const subsection        = ref('');
    const subsections       = ref([]);
    const cashRegisters     = ref([]);
    const submitting        = ref(false);
    const successModal      = ref(false);
    const hasTgMainButton   = ref(!!window.Telegram?.WebApp?.MainButton);

    const toast = ref({ show: false, message: '', type: 'success' });

    const docTypes = computed(() => [
      { value: 'Приход',      icon: '↓', label: 'Кирим' },
      { value: 'Расход',      icon: '↑', label: 'Чиқим' },
      { value: 'Перемещение', icon: '⇄', label: 'Кўчириш' },
    ]);

    function resetForm() {
      documentType.value      = '';
      operations.value        = [];
      operation.value         = '';
      actionTypes.value       = [];
      actionType.value        = '';
      nestedActionTypes.value = [];
      nestedActionType.value  = '';
      cashRegister.value      = '';
      sum.value               = 0;
      formattedSum.value      = '';
      currencyType.value      = 'UZS';
      comment.value           = '';
      subsection.value        = '';
    }

    function showToast(message, type = 'success') {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, 3000);
    }

    const getHeaders = () => ({
      Authorization: 'Basic ' + btoa('admin:57325732'),
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    });

    function opLabel(op) {
      const map = { 'На расходы': 'Харажатларга', 'Поставщику': 'Етказувчига', 'Инвестиции': 'Инвестициялар' };
      return map[op] ?? op;
    }

    function selectDocType(type) {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      documentType.value = type;
    }

    function selectOperation(op) {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      operation.value = op;
      fetchActionTypeByOrganization();
    }

    function setCurrency(c) {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
      currencyType.value = c;
    }

    const fetchUserRole = async () => {
      try {
        const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (!chatId) return;
        const res = await axios.get(`${apiLink}/user?chatId=${chatId}`, { headers: getHeaders() });
        userRole.value = res.data.data.role;
        userOrg.value  = res.data.data.organization;
        if (userRole.value === 'AUP') {
          await fetchSubsections(userOrg.value);
          await fetchCashRegisters();
        }
      } catch { /* silent */ }
    };

    const fetchSubsections = async (org) => {
      try {
        const res = await axios.get(`${apiLink}/subsection?organizationName=${encodeURIComponent(org)}`, {
          headers: getHeaders(),
        });
        subsections.value = res.data.data;
      } catch { subsections.value = []; }
    };

    const fetchCashRegisters = async () => {
      try {
        const res = await axios.get(`${apiLink}/cashregister`, { headers: getHeaders() });
        cashRegisters.value = res.data.data;
      } catch { cashRegisters.value = []; }
    };

    const fetchActionTypeByOrganization = async () => {
      if (!operation.value) { actionTypes.value = []; return; }
      try {
        const res = await axios.get(`${apiLink}/actionType?operationName=${encodeURIComponent(operation.value)}`, {
          headers: getHeaders(),
        });
        actionTypes.value = res.data.data || [];
      } catch { actionTypes.value = []; }
    };

    const fetchActionTypeByActionTypeName = async (name) => {
      if (!name) { nestedActionTypes.value = []; return; }
      try {
        const res = await axios.get(`${apiLink}/actionType?actionTypeName=${encodeURIComponent(name)}`, {
          headers: getHeaders(),
          validateStatus: (s) => s >= 200 && s < 400,
        });
        if (res.status !== 304) nestedActionTypes.value = res.data.data || [];
      } catch { nestedActionTypes.value = []; }
    };

    const fetchNestedActionTypes = async () => { await fetchActionTypeByActionTypeName(actionType.value); };
    const fetchNestedActionType  = async () => { await fetchActionTypeByActionTypeName(nestedActionType.value); };

    const formatSum = (e) => {
      const digits = e.target.value.replace(/\D/g, '');
      sum.value = parseInt(digits, 10) || 0;
      formattedSum.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const submitDocument = async () => {
      if (submitting.value) return;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      submitting.value = true;

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) tg.MainButton.showProgress(false);

      try {
        const chatId = tg?.initDataUnsafe?.user?.id;
        const payload = {
          documentType: documentType.value || '',
          chatId,
          operation:    operation.value || '',
          actionType:   operation.value === 'На расходы'
            ? (nestedActionType.value || '')
            : (actionType.value || ''),
          toCashRegister: documentType.value === 'Перемещение' ? (cashRegister.value || '') : '',
          sum:            parseFloat(sum.value) || 0,
          currencyType:   currencyType.value || 'UZS',
          comment:        comment.value || '',
          subsection:     userRole.value === 'AUP' ? (subsection.value || '') : '',
          cashRegister:   userRole.value === 'AUP' ? (cashRegister.value || '') : '',
        };

        const res = await axios.post(`${apiLink}/document`, payload, { headers: getHeaders() });

        // Backend returns HTTP 200 even on business-logic failures, with
        // { Code: '4xx', message: '...' }. Treat anything other than Code '200'
        // (or no Code field at all) as success only when status is 2xx + no Code error.
        const apiCode = res?.data?.Code;
        const isApiSuccess = apiCode === undefined || apiCode === null || apiCode === '200' || apiCode === 200;

        if (!isApiSuccess) {
          const apiMsg = (typeof res.data?.message === 'string' && res.data.message) || 'Хатолик юз берди. Қайта уриниб кўринг.';
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
          showToast(apiMsg, 'error');
          if (tg?.MainButton) tg.MainButton.hideProgress();
          submitting.value = false;
          return;
        }

        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        if (tg?.MainButton) { tg.MainButton.hideProgress(); tg.MainButton.hide(); }

        // Show modal BEFORE resetForm() so any watchers fired by reset
        // can't accidentally interfere with the success UI.
        successModal.value = true;
        resetForm();
        submitting.value = false;
      } catch {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
        showToast('Хатолик юз берди. Қайта уриниб кўринг.', 'error');
        if (tg?.MainButton) tg.MainButton.hideProgress();
        submitting.value = false;
      }
    };

    const backToDocuments = () => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      router.push('/app/moliya');
    };

    const goToDocuments = () => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      successModal.value = false;
      router.push('/app/moliya');
    };

    watch(documentType, (val) => {
      actionTypes.value = [];
      operations.value  = [];
      nestedActionTypes.value = [];
      operation.value   = '';
      actionType.value  = '';
      nestedActionType.value = '';

      if (val === 'Расход') {
        operations.value = ['На расходы', 'Поставщику', 'Инвестиции'];
      }
      if (val === 'Перемещение') fetchCashRegisters();
    });

    onMounted(async () => {
      resetForm();

      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        await fetchUserRole();
      }

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        tg.MainButton.setText('Жўнатиш');
        tg.MainButton.show();
        tg.MainButton.onClick(submitDocument);
      }
      if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(backToDocuments);
      }
    });

    onUnmounted(() => {
      const tg = window.Telegram?.WebApp;
      tg?.MainButton?.hide();
      tg?.MainButton?.offClick(submitDocument);
      tg?.BackButton?.hide();
      tg?.BackButton?.offClick(backToDocuments);
    });

    return {
      documentType, docTypes, operations, operation, actionTypes, actionType,
      nestedActionTypes, nestedActionType, cashRegister, cashRegisters,
      formattedSum, currencyType, comment, userRole, subsection, subsections,
      submitting, successModal, hasTgMainButton, toast,
      selectDocType, selectOperation, setCurrency,
      fetchNestedActionTypes, fetchNestedActionType,
      formatSum, submitDocument, backToDocuments, goToDocuments, opLabel, resetForm,
    };
  },
};
</script>

<style scoped>
.create-page {
  min-height: 100dvh;
  background: var(--surface-1);
  padding-bottom: 32px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  position: sticky;
  top: 0;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 10;
}
.back-btn {
  width: 40px; height: 40px;
  border: none; border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-primary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: transform 150ms;
}
.back-btn:active { transform: scale(0.92); }
.page-title {
  font-size: 18px; font-weight: 700;
  color: var(--text-primary);
}

/* Form body */
.form-body { display: flex; flex-direction: column; gap: 18px; padding: 16px; }

/* Field */
.field { display: flex; flex-direction: column; gap: 7px; }
.field-label {
  font-size: 12px; font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
}

/* Type cards */
.type-cards { display: flex; gap: 10px; }
.type-card {
  flex: 1; min-height: 72px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  border-radius: 14px;
  border: 2px solid var(--border-subtle);
  background: var(--surface-2);
  cursor: pointer;
  overflow: visible;
  transition: all 180ms ease;
}
.type-card:active { transform: scale(0.95); }
.type-card.active {
  border-color: var(--brand-500);
  background: var(--brand-50, #EFF6FF);
}
.type-icon { font-size: 22px; line-height: 1; font-style: normal; }
.type-label { font-size: 12px; font-weight: 700; color: var(--text-primary); line-height: 1; }

/* Segmented */
.seg-control { display: flex; background: var(--surface-2); border-radius: 10px; padding: 3px; gap: 2px; }
.seg-btn {
  flex: 1; height: 36px; border: none; border-radius: 7px;
  background: transparent; color: var(--text-secondary);
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 180ms ease;
}
.seg-btn.active {
  background: var(--surface-1);
  color: var(--text-primary);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* Select */
.select-wrap { position: relative; }
.select-wrap::after {
  content: '▾'; position: absolute;
  right: 14px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--text-secondary); font-size: 13px;
}
.field-input {
  width: 100%; height: 52px; border-radius: 12px;
  border: 1.5px solid transparent;
  background: var(--surface-2);
  color: var(--text-primary);
  padding: 0 16px; font-size: 16px;
  appearance: none; -webkit-appearance: none; outline: none;
  transition: border-color 150ms, background 150ms;
}
.field-input:focus { border-color: var(--brand-500); background: var(--surface-1); }
.field-input:disabled { opacity: 0.45; cursor: not-allowed; }
.field-input.textarea {
  height: auto; padding: 14px 16px; resize: none;
  line-height: 1.5;
}

/* Sum */
.sum-field { align-items: center; }
.sum-input {
  width: 100%; height: 72px;
  border-radius: 14px;
  border: 1.5px solid transparent;
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 32px; font-weight: 800;
  letter-spacing: -1px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color 150ms;
}
.sum-input:focus { border-color: var(--brand-500); background: var(--surface-1); }

/* Currency toggle */
.currency-seg {
  display: flex; gap: 6px; margin-top: 4px;
}
.curr-btn {
  flex: 1; height: 38px; border-radius: 10px;
  border: 1.5px solid var(--border-subtle);
  background: var(--surface-2); color: var(--text-secondary);
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 150ms;
}
.curr-btn.active {
  background: var(--brand-500); color: #fff; border-color: var(--brand-500);
}

/* Submit */
.submit-btn {
  height: 52px; border-radius: 14px; border: none;
  background: linear-gradient(135deg, var(--gradient-start, #2563EB), var(--gradient-end, #6B21A8));
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 16px rgba(37,99,235,0.28);
  cursor: pointer; transition: transform 150ms;
}
.submit-btn:active:not(:disabled) { transform: scale(0.97); }
.submit-btn:disabled { opacity: 0.6; cursor: default; }

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.toast {
  position: fixed; top: 16px; left: 16px; right: 16px;
  padding: 14px 16px; border-radius: 14px;
  font-size: 14px; font-weight: 600; text-align: center;
  z-index: 300; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.toast.error   { background: var(--status-error-bg, #FEE2E2);   color: var(--status-error-fg, #B91C1C); }
.toast.success { background: var(--status-success-bg, #DCFCE7); color: var(--status-success-fg, #15803D); }
.toast-enter-active, .toast-leave-active { transition: opacity 250ms, transform 250ms; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }

/* Success modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 400;
  padding: 16px;
}
.modal-card {
  width: 100%; max-width: 420px;
  background: var(--surface-1);
  border-radius: 24px;
  padding: 32px 24px 28px;
  display: flex; flex-direction: column; align-items: center;
  gap: 12px;
  box-shadow: 0 -4px 40px rgba(0,0,0,0.18);
}
.modal-icon-wrap {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: #DCFCE7;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.modal-title {
  font-size: 20px; font-weight: 800;
  color: var(--text-primary);
  text-align: center;
}
.modal-sub {
  font-size: 14px; color: var(--text-secondary);
  text-align: center; line-height: 1.5;
}
.modal-btn {
  margin-top: 8px;
  width: 100%; height: 52px;
  border-radius: 14px; border: none;
  background: linear-gradient(135deg, #16A34A, #15803D);
  color: #fff; font-size: 16px; font-weight: 700;
  cursor: pointer;
  transition: transform 150ms;
}
.modal-btn:active { transform: scale(0.97); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 250ms, transform 250ms; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: translateY(24px); }
</style>
