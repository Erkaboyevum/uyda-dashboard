<template>
  <div class="doc-create-page">
    <!-- Header -->
    <div class="page-header">
      <button
        class="back-btn"
        :disabled="isSubmitting"
        @click="goBack"
        :aria-label="t('back')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <h1 class="page-title">{{ t('finance.newDocument') }}</h1>
    </div>

    <div class="form-body">
      <!-- Document type cards -->
      <div class="field">
        <label class="field-label">{{ t('finance.documentType') }}</label>
        <div class="type-grid">
          <button
            v-for="dt in docTypes"
            :key="dt.value"
            type="button"
            class="type-card"
            :class="[dt.cls, { active: documentType === dt.value }]"
            :disabled="isSubmitting"
            @click="selectType(dt.value)"
          >
            <span class="type-icon">{{ dt.icon }}</span>
            <span class="type-label">{{ t(dt.tKey) }}</span>
          </button>
        </div>
      </div>

      <!-- Operation (expense only) -->
      <div v-if="documentType === 'Расход'" class="field">
        <label class="field-label">{{ t('finance.operation') }}</label>
        <div class="select-wrap">
          <select
            v-model="operation"
            class="field-input"
            :disabled="isSubmitting"
            @change="onOperationChange"
          >
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="op in operations" :key="op" :value="op">{{ op }}</option>
          </select>
        </div>
      </div>

      <!-- Action type (expense only) -->
      <div v-if="documentType === 'Расход' && actionTypes.length" class="field">
        <label class="field-label">{{ t('finance.actionType') }}</label>
        <div class="select-wrap">
          <select
            v-model="actionType"
            class="field-input"
            :disabled="isSubmitting"
            @change="onActionTypeChange"
          >
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="a in actionTypes" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <!-- Nested action type (expense, "На расходы") — drills down recursively until leaf -->
      <div v-if="documentType === 'Расход' && nestedActionTypes.length" class="field">
        <label class="field-label">&nbsp;</label>
        <div class="select-wrap">
          <select
            v-model="nestedActionType"
            class="field-input"
            :disabled="isSubmitting"
            @change="onNestedActionTypeChange"
          >
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="n in nestedActionTypes" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>

      <!-- Destination cash register (transfer only) -->
      <div v-if="documentType === 'Перемещение'" class="field">
        <label class="field-label">{{ t('finance.toCashRegister') }}</label>
        <div class="select-wrap">
          <select
            v-model="toCashRegister"
            class="field-input"
            :disabled="isSubmitting || !cashRegisters.length"
          >
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="c in cashRegisters" :key="c.cashregisterName" :value="c.cashregisterName">
              {{ c.cashregisterName }}
            </option>
          </select>
        </div>
      </div>

      <!-- Sum -->
      <div class="field">
        <label class="field-label">{{ t('finance.operationSum') }}</label>
        <input
          v-model="formattedSum"
          type="text"
          inputmode="numeric"
          class="field-input"
          :placeholder="t('finance.sumPlaceholder')"
          :disabled="isSubmitting"
          @input="onSumInput"
        />
      </div>

      <!-- Currency -->
      <div class="field">
        <label class="field-label">{{ t('finance.currency') }}</label>
        <div class="seg">
          <button
            type="button"
            class="seg-btn"
            :class="{ active: currencyType === 'UZS' }"
            :disabled="isSubmitting"
            @click="setCurrency('UZS')"
          >UZS</button>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: currencyType === 'USD' }"
            :disabled="isSubmitting"
            @click="setCurrency('USD')"
          >USD</button>
        </div>
      </div>

      <!-- Comment -->
      <div class="field">
        <label class="field-label">{{ t('finance.comment') }}</label>
        <textarea
          v-model="comment"
          class="field-input field-textarea"
          rows="3"
          :placeholder="t('finance.commentPlaceholder')"
          :disabled="isSubmitting"
          @input="clearError"
        />
      </div>

      <!-- Inline error -->
      <div v-if="submitError" class="submit-error">{{ submitError }}</div>

      <!-- Fallback submit button (when no Telegram MainButton) -->
      <button
        v-if="!hasTgMainButton"
        class="submit-btn"
        :disabled="isSubmitting"
        @click="submitDocument"
      >
        <span v-if="isSubmitting" class="spinner" />
        {{ isSubmitting ? t('finance.submitting') : t('finance.submit') }}
      </button>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import apiLink from '@/config/api';
import { useCurrentUser } from '@/composables/useCurrentUser';

export default {
  name: 'DocumentCreate',
  setup() {
    const { t }  = useI18n();
    const router = useRouter();
    const { state: currentUser } = useCurrentUser();

    const docTypes = [
      { value: 'Приход',      tKey: 'finance.income',   icon: '↓', cls: 'card-income' },
      { value: 'Расход',      tKey: 'finance.expense',  icon: '↑', cls: 'card-expense' },
      { value: 'Перемещение', tKey: 'finance.transfer', icon: '⇄', cls: 'card-transfer' },
    ];

    // form state
    const documentType     = ref('');
    const operation        = ref('');
    const operations       = ref([]);
    const actionType       = ref('');
    const actionTypes      = ref([]);
    const nestedActionType = ref('');
    const nestedActionTypes= ref([]);
    const toCashRegister   = ref('');
    const cashRegisters    = ref([]);
    const sum              = ref(0);
    const formattedSum     = ref('');
    const currencyType     = ref('UZS');
    const comment          = ref('');

    // submit state
    const isSubmitting = ref(false);
    const submitError  = ref('');
    const toast        = ref({ show: false, message: '', type: 'success' });
    const hasTgMainButton = ref(!!window.Telegram?.WebApp?.MainButton);

    // Track in-flight request + pending navigation so we can cancel on unmount
    let abortController = null;
    let navTimer = null;

    function showToast(message, type = 'success') {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, 2400);
    }

    function clearError() {
      submitError.value = '';
    }

    const getHeaders = () => ({
      Authorization: 'Basic ' + btoa('admin:57325732'),
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    });

    function selectType(value) {
      if (isSubmitting.value) return;
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
      documentType.value = value;
      clearError();

      operation.value = '';
      actionType.value = '';
      nestedActionType.value = '';
      actionTypes.value = [];
      nestedActionTypes.value = [];
      toCashRegister.value = '';

      if (value === 'Расход') {
        operations.value = ['На расходы', 'Поставщику', 'Инвестиции'];
      } else {
        operations.value = [];
      }
      if (value === 'Перемещение') {
        fetchCashRegisters();
      }
    }

    function setCurrency(c) {
      if (isSubmitting.value) return;
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
      currencyType.value = c;
      clearError();
    }

    function onSumInput(e) {
      const raw = String(e.target.value).replace(/\D/g, '');
      sum.value = parseInt(raw, 10) || 0;
      formattedSum.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      clearError();
    }

    async function fetchCashRegisters() {
      try {
        const res = await axios.get(`${apiLink}/cashregister`, { headers: getHeaders() });
        cashRegisters.value = res.data?.data || [];
      } catch {
        cashRegisters.value = [];
      }
    }

    async function onOperationChange() {
      actionType.value = '';
      nestedActionType.value = '';
      nestedActionTypes.value = [];
      clearError();
      if (!operation.value) {
        actionTypes.value = [];
        return;
      }
      try {
        // Use template literal (not axios `params`) so spaces stay as %20, not "+"
        // — the backend rejects "+" in operation/actionType names.
        const url = `${apiLink}/actionType?operationName=${encodeURIComponent(operation.value)}`;
        const res = await axios.get(url, { headers: getHeaders() });
        actionTypes.value = res.data?.data || [];
      } catch {
        actionTypes.value = [];
      }
    }

    async function fetchChildrenOf(parentName) {
      try {
        const url = `${apiLink}/actionType?actionTypeName=${encodeURIComponent(parentName)}`;
        const res = await axios.get(url, {
          headers: getHeaders(),
          validateStatus: (s) => s >= 200 && s < 400,
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    }

    async function onActionTypeChange() {
      nestedActionType.value = '';
      nestedActionTypes.value = [];
      clearError();
      if (operation.value !== 'На расходы' || !actionType.value) return;
      nestedActionTypes.value = await fetchChildrenOf(actionType.value);
    }

    async function onNestedActionTypeChange() {
      clearError();
      if (!nestedActionType.value) return;
      const selected = nestedActionType.value;
      const children = await fetchChildrenOf(selected);
      if (children.length) {
        // Drill deeper — replace options with selected's children, clear pick so user re-selects
        nestedActionTypes.value = children;
        nestedActionType.value = '';
      } else {
        // Leaf reached — hide dropdown; nestedActionType keeps the leaf value for submit
        nestedActionTypes.value = [];
      }
    }

    function isValid() {
      if (!documentType.value) return false;
      if (!sum.value || sum.value <= 0) return false;
      if (documentType.value === 'Перемещение' && !toCashRegister.value) return false;
      if (documentType.value === 'Расход') {
        if (!operation.value) return false;
        if (!actionType.value) return false;
        // If operation is "На расходы" AND the API surfaced nested options,
        // user must pick one. Otherwise the parent actionType is enough.
        if (operation.value === 'На расходы' && nestedActionTypes.value.length && !nestedActionType.value) return false;
      }
      return true;
    }

    async function submitDocument() {
      if (isSubmitting.value) return;

      if (!isValid()) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
        submitError.value = t('errors.requiredField');
        return;
      }

      isSubmitting.value = true;
      submitError.value  = '';

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        tg.MainButton.setText(t('finance.submitting'));
        tg.MainButton.showProgress(false);
        tg.MainButton.disable();
      }
      // Block back navigation during submit
      if (tg?.BackButton) {
        tg.BackButton.offClick(goBack);
        tg.BackButton.onClick(blockBack);
      }

      // Abort any leftover request from a previous attempt before starting a new one
      if (abortController) abortController.abort();
      abortController = new AbortController();

      try {
        const chatId = tg?.initDataUnsafe?.user?.id ?? currentUser.chatId;
        // Match the legacy payload shape — server rejects partial payloads
        // (currencyType must be "UZS"/"USD", subsection/cashRegister/toCashRegister
        //  are always present, even as empty strings)
        const payload = {
          chatId:         String(chatId || ''),
          documentType:   documentType.value,
          operation:      documentType.value === 'Расход' ? operation.value : '',
          actionType:     documentType.value === 'Расход'
            ? (operation.value === 'На расходы' && nestedActionType.value
                ? nestedActionType.value
                : actionType.value)
            : '',
          toCashRegister: documentType.value === 'Перемещение' ? (toCashRegister.value || '') : '',
          sum:            Number(sum.value) || 0,
          currencyType:   currencyType.value || 'UZS',
          comment:        comment.value || '',
          subsection:     currentUser.subsection   || '',
          cashRegister:   currentUser.cashRegister || '',
        };

        const response = await axios.post(`${apiLink}/document`, payload, {
          headers: getHeaders(),
          timeout: 15000,
          signal: abortController.signal,
          validateStatus: (s) => s >= 200 && s < 500,
        });

        const body = response.data || {};
        const ok =
          response.status === 200 &&
          (body.responseCode === 200 ||
           body.responseCode === '200' ||
           body.Code === '200' ||
           body.Code === 200 ||
           (body.responseCode === undefined && body.Code === undefined));

        if (!ok) {
          throw new Error(body.errorMessage || body.message || t('errors.saveFailed'));
        }

        // SUCCESS — only NOW leave the form
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        if (tg?.MainButton) tg.MainButton.hideProgress();
        showToast(t('finance.submitSuccess'), 'success');
        navTimer = setTimeout(() => {
          navTimer = null;
          router.replace('/app/moliya');
        }, 700);
      } catch (err) {
        // Aborted requests are not real errors — they happen on unmount
        if (axios.isCancel?.(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
        submitError.value =
          err?.response?.data?.errorMessage ||
          err?.message ||
          t('errors.networkError');
      } finally {
        isSubmitting.value = false;
        if (tg?.MainButton) {
          tg.MainButton.hideProgress();
          tg.MainButton.enable();
          tg.MainButton.setText(t('finance.submit'));
        }
        if (tg?.BackButton) {
          tg.BackButton.offClick(blockBack);
          tg.BackButton.onClick(goBack);
        }
      }
    }

    function goBack() {
      if (isSubmitting.value) return;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
      router.push('/app/moliya');
    }

    function blockBack() {
      // While submitting, ignore back taps + small haptic so user knows it registered
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('rigid');
    }

    onMounted(() => {
      // Fresh mount — make sure no stale state from a previous attempt is lingering
      isSubmitting.value = false;
      submitError.value  = '';

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        // hide() + show() forces Telegram to drop any leftover progress visual
        tg.MainButton.hide();
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
        tg.MainButton.setText(t('finance.submit'));
        tg.MainButton.show();
        tg.MainButton.onClick(submitDocument);
      }
      if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(goBack);
      }
    });

    onUnmounted(() => {
      // Kill any in-flight request and pending navigation so the next mount is clean
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      if (navTimer) {
        clearTimeout(navTimer);
        navTimer = null;
      }

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
        tg.MainButton.hide();
        tg.MainButton.offClick(submitDocument);
      }
      if (tg?.BackButton) {
        tg.BackButton.hide();
        tg.BackButton.offClick(goBack);
        tg.BackButton.offClick(blockBack);
      }
    });

    return {
      t, docTypes,
      documentType, operation, operations,
      actionType, actionTypes, nestedActionType, nestedActionTypes,
      toCashRegister, cashRegisters,
      formattedSum, currencyType, comment,
      isSubmitting, submitError, hasTgMainButton, toast,
      selectType, setCurrency, onSumInput, onOperationChange, onActionTypeChange, onNestedActionTypeChange,
      submitDocument, goBack, clearError,
    };
  },
};
</script>

<style scoped>
.doc-create-page {
  min-height: 100dvh;
  background: var(--surface-1);
  padding-bottom: 120px;
}

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
  border: none;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-primary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 150ms;
}
.back-btn:active:not(:disabled) { transform: scale(0.92); }
.back-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px; font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Document type cards */
.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 14px;
  border: 1.5px solid transparent;
  background: var(--surface-2);
  cursor: pointer;
  transition: transform 150ms, border-color 150ms, background 150ms, opacity 150ms;
  font-family: inherit;
}
.type-card:disabled { opacity: 0.5; cursor: not-allowed; }
.type-card:active:not(:disabled) { transform: scale(0.97); }

.type-icon {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  font-size: 18px; font-weight: 700;
}
.type-label {
  font-size: 13px; font-weight: 600;
  color: var(--text-primary);
}

.card-income   .type-icon { background: #DCFCE7; color: #15803D; }
.card-expense  .type-icon { background: #FEE2E2; color: #B91C1C; }
.card-transfer .type-icon { background: #DBEAFE; color: #1D4ED8; }

.card-income.active   { border-color: #15803D; background: rgba(34,197,94,0.10); }
.card-expense.active  { border-color: #B91C1C; background: rgba(239,68,68,0.10); }
.card-transfer.active { border-color: #1D4ED8; background: rgba(37,99,235,0.10); }

/* Inputs */
.select-wrap { position: relative; }
.select-wrap::after {
  content: '▾';
  position: absolute;
  right: 14px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
  font-size: 13px;
}

.field-input {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  border: 1.5px solid transparent;
  background: var(--surface-2);
  color: var(--text-primary);
  padding: 0 16px;
  font-size: 16px;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: border-color 150ms, background 150ms, opacity 150ms;
}
.field-input:focus { border-color: var(--brand-500); background: var(--surface-1); }
.field-input:disabled { opacity: 0.5; cursor: not-allowed; }
.field-textarea {
  height: auto;
  min-height: 88px;
  padding: 12px 16px;
  resize: vertical;
  line-height: 1.4;
}

/* Currency segmented */
.seg {
  display: flex;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 4px;
  gap: 3px;
}
.seg-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  transition: all 180ms;
  font-family: inherit;
}
.seg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.seg-btn.active {
  background: var(--surface-1);
  color: var(--text-primary);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* Submit error */
.submit-error {
  background: var(--status-error-bg, #FEE2E2);
  color: var(--status-error-fg, #B91C1C);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

/* Fallback submit button */
.submit-btn {
  margin-top: 8px;
  height: 52px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, var(--gradient-start, #2563EB), var(--gradient-end, #6B21A8));
  color: #fff;
  font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(37,99,235,0.28);
  cursor: pointer;
  transition: transform 150ms;
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
  position: fixed;
  top: 16px; left: 16px; right: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 14px; font-weight: 600;
  text-align: center;
  z-index: 300;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.toast.error   { background: var(--status-error-bg, #FEE2E2);   color: var(--status-error-fg, #B91C1C); }
.toast.success { background: var(--status-success-bg, #DCFCE7); color: var(--status-success-fg, #15803D); }
.toast-enter-active, .toast-leave-active { transition: opacity 250ms, transform 250ms; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
</style>
