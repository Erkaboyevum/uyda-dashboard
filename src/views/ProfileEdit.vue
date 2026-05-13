<template>
  <div class="edit-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="backTo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <h1 class="page-title">{{ t('profileEditTitle') }}</h1>
    </div>

    <div class="form-body">
      <!-- Language toggle -->
      <div class="field">
        <label class="field-label">{{ t('language') }}</label>
        <div class="lang-seg">
          <button
            class="lang-btn"
            :class="{ active: language === 'uzbek-crylic' }"
            @click="setLang('uzbek-crylic')"
          >{{ t('languageUz') }}</button>
          <button
            class="lang-btn"
            :class="{ active: language === 'russian' }"
            @click="setLang('russian')"
          >{{ t('languageRu') }}</button>
        </div>
      </div>

      <!-- Full name -->
      <div class="field">
        <label class="field-label">{{ t('fullName') }}</label>
        <input v-model="fullName" class="field-input" type="text" :placeholder="t('fullNamePlaceholder')" />
      </div>

      <!-- Organization -->
      <div class="field">
        <label class="field-label">{{ t('organization') }}</label>
        <div class="select-wrap">
          <select v-model="selectedOrganization" class="field-input" @change="fetchSubsections">
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="org in organizations" :key="org.organizationName" :value="org.organizationName">
              {{ org.organizationName }}
            </option>
          </select>
        </div>
      </div>

      <!-- Subsection -->
      <div class="field" :class="{ dimmed: !subsections.length }">
        <label class="field-label">{{ t('subsection') }}</label>
        <div class="select-wrap">
          <select v-model="selectedSubsection" class="field-input" :disabled="!subsections.length">
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="s in subsections" :key="s.subsectionName" :value="s.subsectionName">
              {{ s.subsectionName }}
            </option>
          </select>
        </div>
      </div>

      <!-- Cash register -->
      <div class="field" :class="{ dimmed: !cashRegisters.length }">
        <label class="field-label">{{ t('cashRegister') }}</label>
        <div class="select-wrap">
          <select v-model="selectedCashRegister" class="field-input" :disabled="!cashRegisters.length">
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="c in cashRegisters" :key="c.cashregisterName" :value="c.cashregisterName">
              {{ c.cashregisterName }}
            </option>
          </select>
        </div>
      </div>

      <!-- Save button (fallback) -->
      <button v-if="!hasTgMainButton" class="save-btn" :disabled="saving" @click="updateProfile">
        <span v-if="saving" class="spinner" />
        {{ saving ? t('submitting') : t('save') }}
      </button>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
    </Transition>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import apiLink from '@/config/api';
import i18n, { LANG_STORAGE_KEY } from '@/i18n';

export default {
  name: 'ProfileEdit',
  setup() {
    const { t }  = useI18n();
    const router = useRouter();

    const chatId                = ref(null);
    const fullName              = ref('');
    const checked               = ref(1);
    const role                  = ref('');
    const selectedOrganization  = ref('');
    const selectedSubsection    = ref('');
    const selectedCashRegister  = ref('');
    const organizations         = ref([]);
    const subsections           = ref([]);
    const cashRegisters         = ref([]);
    const language              = ref('uzbek-crylic');
    const saving                = ref(false);
    const hasTgMainButton       = ref(!!window.Telegram?.WebApp?.MainButton);

    const toast = ref({ show: false, message: '', type: 'success' });

    function showToast(message, type = 'success') {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, 3000);
    }

    function setLang(lang) {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
      language.value = lang;
      i18n.global.locale.value = lang;
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    }

    const getHeaders = () => ({
      Authorization: 'Basic ' + btoa('admin:57325732'),
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    });

    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${apiLink}/user`, {
          params: { chatId: chatId.value },
          headers: getHeaders(),
        });
        const d = res.data.data;
        fullName.value             = d.fullName              || '';
        selectedOrganization.value = d.organization         || '';
        selectedSubsection.value   = d.subsection           || '';
        selectedCashRegister.value = d.cashRegister         || '';
        language.value             = d.language             || 'uzbek-crylic';
        role.value                 = d.role                 || '';
        checked.value              = d.checked              || 1;
      } catch { /* silent */ }
    };

    const fetchOrganizations = async () => {
      try {
        const res = await axios.get(`${apiLink}/organization`, { headers: getHeaders() });
        organizations.value = res.data.data;
      } catch { /* silent */ }
    };

    const fetchSubsections = async () => {
      if (!selectedOrganization.value) return;
      try {
        const res = await axios.get(`${apiLink}/subsection`, {
          params: { organizationName: selectedOrganization.value.trim() },
          headers: getHeaders(),
          paramsSerializer: (p) => new URLSearchParams(p).toString().replace(/\+/g, '%20'),
        });
        subsections.value = res.data.data;
      } catch { subsections.value = []; }
    };

    const fetchCashRegisters = async () => {
      try {
        const res = await axios.get(`${apiLink}/cashregister`, { headers: getHeaders() });
        cashRegisters.value = res.data.data;
      } catch { /* silent */ }
    };

    const updateProfile = async () => {
      if (saving.value) return;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      saving.value = true;

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) tg.MainButton.showProgress(false);

      try {
        await axios.put(`${apiLink}/user`, {
          chatId:       String(chatId.value),
          fullName:     fullName.value,
          organization: selectedOrganization.value,
          subsection:   selectedSubsection.value,
          cashRegister: selectedCashRegister.value,
          language:     language.value,
          role:         role.value,
          checked:      checked.value,
        }, { headers: getHeaders() });

        // Update locale immediately
        i18n.global.locale.value = language.value;
        localStorage.setItem(LANG_STORAGE_KEY, language.value);

        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        showToast(t('profileUpdateSuccess'), 'success');
        setTimeout(() => router.push('/app/moliya'), 1200);
      } catch {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
        showToast(t('profileUpdateError'), 'error');
        if (tg?.MainButton) tg.MainButton.hideProgress();
      } finally {
        saving.value = false;
      }
    };

    const backTo = () => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      router.push('/app/moliya');
    };

    onMounted(async () => {
      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        chatId.value = window.Telegram.WebApp.initDataUnsafe.user.id;
        await fetchUserProfile();
      }
      await fetchOrganizations();
      await fetchSubsections();
      await fetchCashRegisters();

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        tg.MainButton.setText(t('save'));
        tg.MainButton.show();
        tg.MainButton.onClick(updateProfile);
      }
      if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(backTo);
      }
    });

    onUnmounted(() => {
      const tg = window.Telegram?.WebApp;
      tg?.MainButton?.hide();
      tg?.MainButton?.offClick(updateProfile);
      tg?.BackButton?.hide();
      tg?.BackButton?.offClick(backTo);
    });

    return {
      t, fullName, language, setLang,
      selectedOrganization, selectedSubsection, selectedCashRegister,
      organizations, subsections, cashRegisters,
      saving, hasTgMainButton, toast,
      fetchSubsections, updateProfile, backTo,
    };
  },
};
</script>

<style scoped>
.edit-page {
  min-height: 100dvh;
  background: var(--surface-1);
  padding-bottom: 32px;
}

.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 16px 12px;
  position: sticky; top: 0;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 10;
}
.back-btn {
  width: 40px; height: 40px; border: none; border-radius: 10px;
  background: var(--surface-2); color: var(--text-primary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: transform 150ms;
}
.back-btn:active { transform: scale(0.92); }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.form-body { display: flex; flex-direction: column; gap: 16px; padding: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px; font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
}

/* Language segmented */
.lang-seg { display: flex; background: var(--surface-2); border-radius: 12px; padding: 4px; gap: 3px; }
.lang-btn {
  flex: 1; height: 44px; border: none; border-radius: 8px;
  background: transparent; color: var(--text-secondary);
  font-size: 14px; font-weight: 500; cursor: pointer;
  transition: all 180ms ease;
}
.lang-btn.active {
  background: var(--surface-1); color: var(--text-primary);
  font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.select-wrap { position: relative; }
.select-wrap::after {
  content: '▾'; position: absolute;
  right: 14px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--text-secondary); font-size: 13px;
}

.field-input {
  width: 100%; height: 52px; border-radius: 12px;
  border: 1.5px solid transparent;
  background: var(--surface-2); color: var(--text-primary);
  padding: 0 16px; font-size: 16px;
  appearance: none; -webkit-appearance: none; outline: none;
  transition: border-color 150ms, background 150ms;
}
.field-input:focus { border-color: var(--brand-500); background: var(--surface-1); }
.field-input:disabled { opacity: 0.45; cursor: not-allowed; }
.dimmed { opacity: 0.6; }

.save-btn {
  margin-top: 8px; height: 52px; border-radius: 14px; border: none;
  background: linear-gradient(135deg, var(--gradient-start, #2563EB), var(--gradient-end, #6B21A8));
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 16px rgba(37,99,235,0.28); cursor: pointer; transition: transform 150ms;
}
.save-btn:active:not(:disabled) { transform: scale(0.97); }
.save-btn:disabled { opacity: 0.6; cursor: default; }

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
</style>
