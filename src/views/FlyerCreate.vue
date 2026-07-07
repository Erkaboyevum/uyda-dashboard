<template>
  <div class="flyer-create-page">
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
      <h1 class="page-title">{{ t('flyer.createFlyer') }}</h1>
    </div>

    <div class="form-body">
      <!-- Mode toggle -->
      <div class="field">
        <div class="mode-seg">
          <button
            class="mode-btn"
            :class="{ active: mode === 'template' }"
            :disabled="isSubmitting"
            @click="setMode('template')"
          >{{ t('flyer.modeTemplate') }}</button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'manual' }"
            :disabled="isSubmitting"
            @click="setMode('manual')"
          >{{ t('flyer.modeManual') }}</button>
        </div>
      </div>

      <!-- Template -->
      <div v-if="mode === 'template'" class="field">
        <label class="field-label">{{ t('flyer.templateLabel') }}</label>
        <div class="select-wrap" :class="{ 'is-loading': templatesLoading }">
          <select
            v-model="selectedTemplateId"
            class="field-input"
            :disabled="isSubmitting || templatesLoading || !templates.length"
          >
            <option value="" disabled>
              {{ templatesLoading ? t('submitting') : t('selectOne') }}
            </option>
            <option
              v-for="tpl in templates"
              :key="tpl.id"
              :value="tpl.id"
            >{{ tpl.name }}</option>
          </select>
          <span v-if="!templatesLoading" class="select-arrow">▾</span>
          <span v-else class="select-spinner" />
        </div>
        <div v-if="!templatesLoading && !templatesError && templates.length === 0" class="empty-hint">
          {{ t('flyer.templatesEmpty') }} — {{ t('flyer.templatesEmptyHint') }}
        </div>

        <!-- Discount preview -->
        <div v-if="selectedTemplate" class="discount-preview">
          <template v-if="selectedTemplate.flyerType === 'tiered'">
            <div
              v-for="(th, idx) in selectedTemplate.thresholds"
              :key="idx"
              class="discount-row"
            >
              <span class="discount-amount">{{ t('flyer.thresholdUpTo', { amount: formatAmount(th.maxAmount) }) }}</span>
              <span class="discount-percent">{{ th.discountPercent }}%</span>
            </div>
          </template>
          <div v-else class="discount-row">
            <span class="discount-amount">{{ t('flyer.discount') }}</span>
            <span class="discount-percent">{{ selectedTemplate.discountPercent }}%</span>
          </div>
        </div>
      </div>

      <!-- Counterparty -->
      <div class="field">
        <label class="field-label">{{ t('flyer.counterparty') }}</label>
        <div class="select-wrap" :class="{ 'is-loading': counterpartiesLoading }">
          <select
            v-model="promoterId"
            class="field-input"
            :disabled="isSubmitting || counterpartiesLoading"
          >
            <option value="" disabled>
              {{ counterpartiesLoading ? t('submitting') : t('selectOne') }}
            </option>
            <option
              v-for="cp in counterparties"
              :key="cp.id"
              :value="cp.id"
            >{{ cp.name }}</option>
          </select>
          <span v-if="!counterpartiesLoading" class="select-arrow">▾</span>
          <span v-else class="select-spinner" />
        </div>
      </div>

      <!-- Discount Percent (manual mode only) -->
      <div v-if="mode === 'manual'" class="field">
        <label class="field-label">{{ t('flyer.discountPercent') }}</label>
        <input
          v-model.number="discountPercent"
          type="number"
          inputmode="numeric"
          min="1"
          max="100"
          class="field-input"
          :placeholder="t('flyer.discountPercentPlaceholder')"
          :disabled="isSubmitting"
          @input="clearError"
        />
      </div>

      <!-- Flyer Quantity -->
      <div class="field">
        <label class="field-label">{{ t('flyer.flyerQuantity') }}</label>
        <input
          v-model.number="flyerQuantity"
          type="number"
          inputmode="numeric"
          min="1"
          class="field-input"
          :placeholder="t('flyer.flyerQuantityPlaceholder')"
          :disabled="isSubmitting"
          @input="clearError"
        />
      </div>

      <!-- Templates fetch error -->
      <div v-if="mode === 'template' && templatesError" class="fetch-error">{{ templatesError }}</div>

      <!-- Counterparties fetch error -->
      <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>

      <!-- Inline submit error -->
      <div v-if="submitError" class="submit-error">{{ submitError }}</div>

      <!-- Submit -->
      <button
        class="submit-btn"
        :disabled="isSubmitting || !isFormValid"
        @click="submitFlyer"
      >
        <span v-if="isSubmitting" class="spinner" />
        {{ isSubmitting ? t('submitting') : t('flyer.create') }}
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

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';

const { t } = useI18n();
const router = useRouter();

const FLYER_BASE     = 'https://api.erkaboyev.uz/Golddishes/hs/flyers';
const TEMPLATES_BASE = `${FLYER_BASE}/templates`;
const FALLBACK_CHAT_ID = '1319223069';

const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
  : FALLBACK_CHAT_ID;

const getFlyerHeaders = () => ({
  Authorization: 'Basic ' + btoa('ADMIN SHAXBOZ:2005Shah@'),
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
});

const counterparties = ref([]);
const counterpartiesLoading = ref(false);
const fetchError = ref('');

const mode = ref('template'); // 'template' | 'manual'
const templates = ref([]);
const templatesLoading = ref(false);
const templatesError = ref('');
const selectedTemplateId = ref('');

const promoterId = ref('');
const discountPercent = ref('');
const flyerQuantity = ref('');

const isSubmitting = ref(false);
const submitError = ref('');
const toast = ref({ show: false, message: '', type: 'success' });

let navTimer = null;

function setMode(next) {
  if (isSubmitting.value || mode.value === next) return;
  window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  mode.value = next;
  clearError();
}

const selectedTemplate = computed(() =>
  templates.value.find(tpl => tpl.id === selectedTemplateId.value) || null
);

function formatAmount(amount) {
  return String(Number(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const isFormValid = computed(() => {
  if (promoterId.value === '' || Number(flyerQuantity.value) <= 0) return false;
  return mode.value === 'template'
    ? selectedTemplateId.value !== ''
    : Number(discountPercent.value) > 0;
});

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 2400);
}

function clearError() {
  submitError.value = '';
}

async function fetchCounterparties() {
  counterpartiesLoading.value = true;
  fetchError.value = '';
  try {
    const res = await axios.get(`${FLYER_BASE}/counterparty`, {
      params: { chatID: chatId },
      headers: getFlyerHeaders(),
    });
    counterparties.value = res.data?.data || [];
  } catch {
    fetchError.value = t('errors.networkError');
    counterparties.value = [];
  } finally {
    counterpartiesLoading.value = false;
  }
}

async function fetchTemplates() {
  templatesLoading.value = true;
  templatesError.value = '';
  try {
    const res = await axios.get(TEMPLATES_BASE, {
      params: { chatID: chatId },
      headers: getFlyerHeaders(),
    });
    templates.value = res.data?.data || [];
  } catch (err) {
    templatesError.value = err?.response?.data?.errorMessage || t('errors.networkError');
    templates.value = [];
  } finally {
    templatesLoading.value = false;
  }
}

async function submitFlyer() {
  if (isSubmitting.value || !isFormValid.value) return;

  isSubmitting.value = true;
  submitError.value = '';

  try {
    const payload = mode.value === 'template'
      ? {
          chatID: chatId,
          promoter_id: String(promoterId.value),
          flyer_quantity: Number(flyerQuantity.value),
          template_id: selectedTemplateId.value,
        }
      : {
          chatID: chatId,
          discountPercent: Number(discountPercent.value),
          flyer_quantity: Number(flyerQuantity.value),
          promoter_id: String(promoterId.value),
        };

    const res = await axios.post(FLYER_BASE, payload, {
      headers: getFlyerHeaders(),
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
    });

    if (res.status !== 200) {
      throw new Error(res.data?.errorMessage || t('errors.saveFailed'));
    }

    // Kick off PDF generation + Telegram delivery — fire-and-forget so the UI
    // doesn't block. The PDFs will arrive in Telegram within a few seconds.
    const generatedFlyers = res.data?.data || res.data?.flyers || [];
    if (generatedFlyers.length > 0) {
      axios.post('/api/flyer/generate', {
        chatID: chatId,
        flyers: generatedFlyers,
      }).catch(err => console.warn('[pdf]', err.message));
    }

    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    showToast(t('flyer.createSuccess'), 'success');

    promoterId.value = '';
    discountPercent.value = '';
    flyerQuantity.value = '';
    selectedTemplateId.value = '';

    navTimer = setTimeout(() => {
      navTimer = null;
      router.replace('/app/savdo');
    }, 1200);
  } catch (err) {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
    submitError.value =
      err?.response?.data?.errorMessage ||
      err?.message ||
      t('errors.networkError');
  } finally {
    isSubmitting.value = false;
  }
}

function goBack() {
  if (isSubmitting.value) return;
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
  router.push('/app/savdo');
}

onMounted(() => {
  fetchCounterparties();
  fetchTemplates();

  const tg = window.Telegram?.WebApp;
  if (tg?.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(goBack);
  }
});

onUnmounted(() => {
  if (navTimer) {
    clearTimeout(navTimer);
    navTimer = null;
  }
  const tg = window.Telegram?.WebApp;
  if (tg?.BackButton) {
    tg.BackButton.hide();
    tg.BackButton.offClick(goBack);
  }
});
</script>

<style scoped>
.flyer-create-page {
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

.mode-seg { display: flex; background: var(--surface-2); border-radius: 12px; padding: 4px; gap: 3px; }
.mode-btn {
  flex: 1; height: 44px; border: none; border-radius: 8px;
  background: transparent; color: var(--text-secondary);
  font-size: 14px; font-weight: 500; cursor: pointer;
  font-family: inherit;
  transition: all 180ms ease;
}
.mode-btn.active {
  background: var(--surface-1); color: var(--text-primary);
  font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.mode-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.empty-hint {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 2px 0;
}

.discount-preview {
  margin-top: 10px;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 4px 14px;
}
.discount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.discount-row:last-child { border-bottom: none; }
.discount-amount {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.discount-percent {
  font-size: 17px;
  font-weight: 800;
  color: var(--brand-500);
  flex-shrink: 0;
}

.select-wrap { position: relative; }
.select-arrow {
  position: absolute;
  right: 14px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
  font-size: 13px;
}
.select-spinner {
  position: absolute;
  right: 14px; top: 50%;
  transform: translateY(-50%);
  width: 16px; height: 16px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--brand-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  pointer-events: none;
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

/* Remove number input arrows */
.field-input[type="number"]::-webkit-outer-spin-button,
.field-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.field-input[type="number"] { -moz-appearance: textfield; }

.fetch-error {
  background: var(--status-warn-bg, #FEF3C7);
  color: var(--status-warn-fg, #B45309);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px; font-weight: 500;
  text-align: center;
}

.submit-error {
  background: var(--status-error-bg, #FEE2E2);
  color: var(--status-error-fg, #B91C1C);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px; font-weight: 500;
  text-align: center;
}

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
  font-family: inherit;
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
