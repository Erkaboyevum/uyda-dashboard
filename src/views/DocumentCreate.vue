<template>
  <div class="dc-page">

    <!-- Header -->
    <div class="dc-header">
      <button class="dc-back" @click="handleBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <span class="dc-header-title">Ҳужжат яратиш</span>
    </div>

    <!-- Body -->
    <div class="dc-body">

      <!-- Doc type -->
      <div class="dc-field">
        <span class="dc-label">Ҳужжат тури</span>
        <div class="dc-type-row">
          <button
            v-for="t in DOC_TYPES"
            :key="t.key"
            class="dc-type-btn"
            :class="{ active: docType === t.key }"
            @click="pickDocType(t.key)"
          >
            <span class="dc-type-icon" :style="{ color: t.color }">{{ t.icon }}</span>
            <span class="dc-type-name">{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Operation (only for Расход) -->
      <div v-if="docType === 'Расход'" class="dc-field">
        <span class="dc-label">Операция тури</span>
        <div class="dc-seg">
          <button
            v-for="op in OPERATIONS"
            :key="op.key"
            class="dc-seg-btn"
            :class="{ active: operation === op.key }"
            @click="pickOperation(op.key)"
          >{{ op.label }}</button>
        </div>
      </div>

      <!-- ActionType level 1 -->
      <div v-if="actionTypes.length" class="dc-field">
        <span class="dc-label">Статья</span>
        <div class="dc-select-wrap">
          <select v-model="actionType" class="dc-select" @change="onActionTypeChange">
            <option value="" disabled>Танланг...</option>
            <option v-for="a in actionTypes" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <!-- ActionType level 2 -->
      <div v-if="actionTypes2.length" class="dc-field">
        <span class="dc-label">Статья гуруҳи</span>
        <div class="dc-select-wrap">
          <select v-model="actionType2" class="dc-select">
            <option value="" disabled>Танланг...</option>
            <option v-for="a in actionTypes2" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <!-- To cash register (Перемещение) -->
      <div v-if="docType === 'Перемещение'" class="dc-field">
        <span class="dc-label">Qayerga o'tkazish</span>
        <div class="dc-select-wrap">
          <select v-model="toCashReg" class="dc-select">
            <option value="" disabled>Танланг...</option>
            <option v-for="r in cashRegs" :key="r.cashregisterName" :value="r.cashregisterName">
              {{ r.cashregisterName }}
            </option>
          </select>
        </div>
      </div>

      <!-- AUP: subsection + cashRegister -->
      <template v-if="userRole === 'AUP'">
        <div class="dc-field">
          <span class="dc-label">Бўлим</span>
          <div class="dc-select-wrap">
            <select v-model="subsection" class="dc-select">
              <option value="" disabled>Танланг...</option>
              <option v-for="s in subsections" :key="s.name" :value="s.name">{{ s.name }}</option>
            </select>
          </div>
        </div>
        <div class="dc-field">
          <span class="dc-label">Касса</span>
          <div class="dc-select-wrap">
            <select v-model="cashReg" class="dc-select">
              <option value="" disabled>Танланг...</option>
              <option v-for="r in cashRegs" :key="r.cashregisterName" :value="r.cashregisterName">
                {{ r.cashregisterName }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <!-- Sum -->
      <div class="dc-field">
        <span class="dc-label">Сумма</span>
        <input
          class="dc-sum-input"
          type="text"
          inputmode="numeric"
          v-model="displaySum"
          @input="onSumInput"
          placeholder="0"
        />
        <div class="dc-currency-row">
          <button class="dc-cur-btn" :class="{ active: currency === 'UZS' }" @click="currency = 'UZS'">UZS</button>
          <button class="dc-cur-btn" :class="{ active: currency === 'USD' }" @click="currency = 'USD'">USD</button>
        </div>
      </div>

      <!-- Comment -->
      <div class="dc-field">
        <span class="dc-label">Изоҳ</span>
        <textarea
          v-model="comment"
          class="dc-textarea"
          rows="3"
          placeholder="Изоҳ киритинг..."
        />
      </div>

      <!-- Fallback submit button (when no Telegram MainButton) -->
      <button
        v-if="!hasTgBtn"
        class="dc-submit-btn"
        :disabled="busy"
        @click="submit"
      >
        <span v-if="busy" class="dc-spinner" />
        <span v-else>Жўнатиш</span>
      </button>

    </div>

    <!-- Error toast -->
    <Transition name="dc-toast">
      <div v-if="errMsg" class="dc-toast">{{ errMsg }}</div>
    </Transition>

  </div>
</template>

<script>
import axios from 'axios';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import apiLink from '@/config/api';

const DOC_TYPES = [
  { key: 'Приход',      label: 'Кирим',    icon: '↓', color: '#16A34A' },
  { key: 'Расход',      label: 'Чиқим',    icon: '↑', color: '#DC2626' },
  { key: 'Перемещение', label: 'Кўчириш',  icon: '⇄', color: '#2563EB' },
];

const OPERATIONS = [
  { key: 'На расходы', label: 'Харажатларга' },
  { key: 'Поставщику', label: 'Етказувчига'  },
  { key: 'Инвестиции', label: 'Инвестиция'   },
];

const HEADERS = {
  Authorization: 'Basic ' + btoa('admin:57325732'),
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export default {
  name: 'DocumentCreate',
  setup() {
    const router = useRouter();
    const tg     = window.Telegram?.WebApp;

    // ── Form state ──────────────────────────────────────────────
    const docType     = ref('');
    const operation   = ref('');
    const actionType  = ref('');
    const actionType2 = ref('');
    const toCashReg   = ref('');
    const cashReg     = ref('');
    const rawSum      = ref(0);
    const displaySum  = ref('');
    const currency    = ref('UZS');
    const comment     = ref('');
    const subsection  = ref('');

    // ── Remote data ─────────────────────────────────────────────
    const actionTypes  = ref([]);
    const actionTypes2 = ref([]);
    const cashRegs     = ref([]);
    const subsections  = ref([]);
    const userRole     = ref('');
    const userOrg      = ref('');

    // ── UI state ─────────────────────────────────────────────────
    const busy      = ref(false);
    const errMsg    = ref('');
    const hasTgBtn  = ref(!!tg?.MainButton);

    // ── Helpers ──────────────────────────────────────────────────
    function showError(msg) {
      errMsg.value = msg;
      setTimeout(() => { errMsg.value = ''; }, 3500);
    }

    function resetForm() {
      docType.value     = '';
      operation.value   = '';
      actionType.value  = '';
      actionType2.value = '';
      toCashReg.value   = '';
      cashReg.value     = '';
      rawSum.value      = 0;
      displaySum.value  = '';
      currency.value    = 'UZS';
      comment.value     = '';
      subsection.value  = '';
      actionTypes.value  = [];
      actionTypes2.value = [];
    }

    // ── API calls ─────────────────────────────────────────────────
    async function loadUserRole() {
      const chatId = tg?.initDataUnsafe?.user?.id;
      if (!chatId) return;
      try {
        const res = await axios.get(`${apiLink}/user?chatId=${chatId}`, { headers: HEADERS });
        userRole.value = res.data?.data?.role  || '';
        userOrg.value  = res.data?.data?.organization || '';
        if (userRole.value === 'AUP') {
          await Promise.all([loadSubsections(userOrg.value), loadCashRegs()]);
        }
      } catch { /* silent */ }
    }

    async function loadSubsections(org) {
      try {
        const res = await axios.get(`${apiLink}/subsection?organizationName=${encodeURIComponent(org)}`, { headers: HEADERS });
        subsections.value = res.data?.data || [];
      } catch { subsections.value = []; }
    }

    async function loadCashRegs() {
      try {
        const res = await axios.get(`${apiLink}/cashregister`, { headers: HEADERS });
        cashRegs.value = res.data?.data || [];
      } catch { cashRegs.value = []; }
    }

    async function loadActionTypes(operationName) {
      try {
        const res = await axios.get(`${apiLink}/actionType?operationName=${encodeURIComponent(operationName)}`, { headers: HEADERS });
        actionTypes.value = res.data?.data || [];
      } catch { actionTypes.value = []; }
    }

    async function loadActionTypes2(parentName) {
      if (!parentName) { actionTypes2.value = []; return; }
      try {
        const res = await axios.get(`${apiLink}/actionType?actionTypeName=${encodeURIComponent(parentName)}`, { headers: HEADERS });
        actionTypes2.value = res.data?.data || [];
      } catch { actionTypes2.value = []; }
    }

    // ── User actions ──────────────────────────────────────────────
    function pickDocType(key) {
      tg?.HapticFeedback?.impactOccurred('light');
      docType.value    = key;
      operation.value  = '';
      actionType.value = '';
      actionType2.value = '';
      actionTypes.value = [];
      actionTypes2.value = [];
    }

    function pickOperation(key) {
      tg?.HapticFeedback?.impactOccurred('light');
      operation.value  = key;
      actionType.value = '';
      actionType2.value = '';
      actionTypes2.value = [];
      loadActionTypes(key);
    }

    function onActionTypeChange() {
      actionType2.value = '';
      actionTypes2.value = [];
      loadActionTypes2(actionType.value);
    }

    function onSumInput(e) {
      const digits = e.target.value.replace(/\D/g, '');
      rawSum.value    = parseInt(digits, 10) || 0;
      displaySum.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function handleBack() {
      tg?.HapticFeedback?.impactOccurred('light');
      router.push('/app/moliya');
    }

    // ── Submit ────────────────────────────────────────────────────
    async function submit() {
      if (busy.value) return;
      tg?.HapticFeedback?.impactOccurred('medium');
      busy.value = true;
      tg?.MainButton?.showProgress(false);

      try {
        const chatId = tg?.initDataUnsafe?.user?.id;

        const finalActionType = operation.value === 'На расходы'
          ? (actionType2.value || actionType.value)
          : actionType.value;

        await axios.post(`${apiLink}/document`, {
          documentType:   docType.value,
          chatId,
          operation:      operation.value,
          actionType:     finalActionType,
          toCashRegister: docType.value === 'Перемещение' ? toCashReg.value : '',
          sum:            rawSum.value,
          currencyType:   currency.value,
          comment:        comment.value,
          subsection:     userRole.value === 'AUP' ? subsection.value : '',
          cashRegister:   userRole.value === 'AUP' ? cashReg.value   : '',
        }, { headers: HEADERS });

        // ── Success ──
        tg?.HapticFeedback?.notificationOccurred('success');
        tg?.MainButton?.hideProgress();
        tg?.MainButton?.hide();
        busy.value = false;
        resetForm();

        if (tg?.showPopup) {
          tg.showPopup(
            {
              title: 'Муваффақият!',
              message: 'Ҳужжат муваффақиятли юборилди ва тизимга сақланди.',
              buttons: [{ id: 'ok', type: 'default', text: 'Молияга қайтиш' }],
            },
            () => router.push('/app/moliya'),
          );
        } else if (tg?.showAlert) {
          tg.showAlert('✅ Ҳужжат муваффақиятли юборилди!', () => router.push('/app/moliya'));
        } else {
          router.push('/app/moliya');
        }

      } catch {
        // ── Error ──
        tg?.HapticFeedback?.notificationOccurred('error');
        tg?.MainButton?.hideProgress();
        busy.value = false;
        showError('Хатолик юз берди. Қайта уриниб кўринг.');
      }
    }

    // ── Watch: load cash regs when Перемещение selected ──────────
    watch(docType, (val) => {
      if (val === 'Перемещение' && cashRegs.value.length === 0) {
        loadCashRegs();
      }
    });

    // ── Lifecycle ─────────────────────────────────────────────────
    onMounted(async () => {
      resetForm();
      await loadUserRole();

      if (tg?.MainButton) {
        tg.MainButton.setText('Жўнатиш');
        tg.MainButton.show();
        tg.MainButton.onClick(submit);
      }
      if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBack);
      }
    });

    onUnmounted(() => {
      tg?.MainButton?.offClick(submit);
      tg?.MainButton?.hide();
      tg?.BackButton?.offClick(handleBack);
      tg?.BackButton?.hide();
    });

    return {
      DOC_TYPES, OPERATIONS,
      docType, operation, actionType, actionType2, toCashReg,
      cashReg, displaySum, currency, comment, subsection,
      actionTypes, actionTypes2, cashRegs, subsections, userRole,
      busy, errMsg, hasTgBtn,
      pickDocType, pickOperation, onActionTypeChange, onSumInput,
      handleBack, submit,
    };
  },
};
</script>

<style scoped>
/* ── Page ── */
.dc-page {
  min-height: 100dvh;
  background: var(--surface-1);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.dc-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  position: sticky;
  top: 0;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 10;
}
.dc-back {
  width: 38px; height: 38px;
  border: none; border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-primary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: transform 140ms;
}
.dc-back:active { transform: scale(0.90); }
.dc-header-title {
  font-size: 17px; font-weight: 700;
  color: var(--text-primary);
}

/* ── Body ── */
.dc-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 18px 16px 40px;
}

/* ── Field ── */
.dc-field { display: flex; flex-direction: column; gap: 8px; }
.dc-label {
  font-size: 11px; font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.6px;
}

/* ── Doc type cards ── */
.dc-type-row { display: flex; gap: 10px; }
.dc-type-btn {
  flex: 1;
  min-height: 76px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px;
  border-radius: 14px;
  border: 2px solid var(--border-subtle);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 160ms, background 160ms, transform 120ms;
  -webkit-tap-highlight-color: transparent;
  overflow: visible;
}
.dc-type-btn:active { transform: scale(0.94); }
.dc-type-btn.active {
  border-color: var(--brand-500);
  background: color-mix(in srgb, var(--brand-500) 8%, transparent);
}
.dc-type-icon {
  font-size: 24px;
  line-height: 1;
  display: block;
}
.dc-type-name {
  font-size: 12px; font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

/* ── Segmented control ── */
.dc-seg {
  display: flex;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 3px; gap: 2px;
}
.dc-seg-btn {
  flex: 1; height: 34px;
  border: none; border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: background 160ms, color 160ms;
  -webkit-tap-highlight-color: transparent;
}
.dc-seg-btn.active {
  background: var(--surface-1);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
}

/* ── Select ── */
.dc-select-wrap { position: relative; }
.dc-select-wrap::after {
  content: '▾';
  position: absolute; right: 14px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary); font-size: 13px;
}
.dc-select {
  width: 100%; height: 50px;
  border-radius: 12px;
  border: 1.5px solid var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-primary);
  padding: 0 40px 0 16px;
  font-size: 15px;
  appearance: none; -webkit-appearance: none;
  outline: none;
  transition: border-color 150ms;
}
.dc-select:focus { border-color: var(--brand-500); }

/* ── Sum input ── */
.dc-sum-input {
  width: 100%; height: 70px;
  border-radius: 14px;
  border: 1.5px solid var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 30px; font-weight: 800;
  text-align: center;
  letter-spacing: -0.5px;
  outline: none;
  transition: border-color 150ms;
}
.dc-sum-input:focus { border-color: var(--brand-500); }

/* ── Currency ── */
.dc-currency-row { display: flex; gap: 8px; }
.dc-cur-btn {
  flex: 1; height: 38px;
  border-radius: 10px;
  border: 1.5px solid var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  transition: all 140ms;
  -webkit-tap-highlight-color: transparent;
}
.dc-cur-btn.active {
  background: var(--brand-500);
  color: #fff;
  border-color: var(--brand-500);
}

/* ── Textarea ── */
.dc-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1.5px solid var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-primary);
  padding: 12px 16px;
  font-size: 15px; line-height: 1.5;
  resize: none; outline: none;
  transition: border-color 150ms;
}
.dc-textarea:focus { border-color: var(--brand-500); }

/* ── Fallback submit ── */
.dc-submit-btn {
  height: 52px; border-radius: 14px; border: none;
  background: linear-gradient(135deg, #2563EB, #6B21A8);
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer;
  transition: transform 140ms, opacity 140ms;
  -webkit-tap-highlight-color: transparent;
}
.dc-submit-btn:active:not(:disabled) { transform: scale(0.97); }
.dc-submit-btn:disabled { opacity: 0.55; cursor: default; }

/* ── Spinner ── */
.dc-spinner {
  width: 18px; height: 18px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: dc-spin 0.75s linear infinite;
}
@keyframes dc-spin { to { transform: rotate(360deg); } }

/* ── Error toast ── */
.dc-toast {
  position: fixed; bottom: 24px; left: 16px; right: 16px;
  background: #FEE2E2; color: #B91C1C;
  padding: 14px 16px; border-radius: 14px;
  font-size: 14px; font-weight: 600; text-align: center;
  z-index: 500;
  box-shadow: 0 4px 20px rgba(0,0,0,0.14);
}
.dc-toast-enter-active, .dc-toast-leave-active { transition: opacity 220ms, transform 220ms; }
.dc-toast-enter-from, .dc-toast-leave-to { opacity: 0; transform: translateY(10px); }
</style>
