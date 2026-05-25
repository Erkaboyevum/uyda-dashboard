<template>
  <div class="reg-page">
    <!-- Header -->
    <div class="reg-header">
      <div class="reg-avatar">
        <img v-if="profileImg" :src="profileImg" alt="avatar" class="avatar-img" />
        <div v-else class="avatar-fallback">{{ initials }}</div>
      </div>
      <h1 class="reg-title">{{ t('registerTitle') }}</h1>
    </div>

    <!-- Form -->
    <div class="reg-form">
      <!-- Full name -->
      <div class="field">
        <label class="field-label">{{ t('fullName') }}</label>
        <input
          v-model="fullName"
          class="field-input"
          type="text"
          :placeholder="t('fullNamePlaceholder')"
          autocomplete="name"
          @focus="haptic"
        />
      </div>

      <!-- Organization -->
      <div class="field">
        <label class="field-label">{{ t('organization') }}</label>
        <div class="select-wrap">
          <select
            v-model="selectedOrganization"
            class="field-input"
            :disabled="!organizations.length"
            @change="onOrgChange"
          >
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
          <select
            v-model="selectedSubsection"
            class="field-input"
            :disabled="!subsections.length"
          >
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
          <select
            v-model="selectedCashRegister"
            class="field-input"
            :disabled="!cashRegisters.length"
          >
            <option value="" disabled>{{ t('selectOne') }}</option>
            <option v-for="c in cashRegisters" :key="c.cashregisterName" :value="c.cashregisterName">
              {{ c.cashregisterName }}
            </option>
          </select>
        </div>
      </div>

      <!-- Submit button (fallback if no Telegram MainButton) -->
      <button
        v-if="!hasTgMainButton"
        class="submit-btn"
        :disabled="submitting"
        @click="registerUser"
      >
        <span v-if="submitting" class="spinner" />
        {{ submitting ? t('submitting') : t('submit') }}
      </button>
    </div>

    <!-- Error toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import apiLink from '@/config/api';

export default {
  name: 'RegisterView',
  setup() {
    const { t }  = useI18n();
    const router = useRouter();

    const fullName              = ref('');
    const profileImg            = ref('');
    const selectedOrganization  = ref('');
    const selectedSubsection    = ref('');
    const selectedCashRegister  = ref('');
    const organizations         = ref([]);
    const subsections           = ref([]);
    const cashRegisters         = ref([]);
    const submitting            = ref(false);

    const hasTgMainButton = ref(!!window.Telegram?.WebApp?.MainButton);

    const toast = ref({ show: false, message: '', type: 'success' });

    const initials = computed(() => {
      const n = fullName.value || '';
      const p = n.trim().split(/\s+/);
      if (!p[0]) return '?';
      return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
    });

    function showToast(message, type = 'error') {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, 3000);
    }

    function haptic() {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    }

    const getHeaders = () => ({
      Authorization: 'Basic ' + btoa('admin:57325732'),
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    });

    const fetchOrganizations = async () => {
      try {
        const res = await axios.get(`${apiLink}/organization`, { headers: getHeaders() });
        organizations.value = res.data.data;
      } catch { /* silent */ }
    };

    const fetchCashRegisters = async () => {
      try {
        const res = await axios.get(`${apiLink}/cashregister`, { headers: getHeaders() });
        cashRegisters.value = res.data.data;
      } catch { /* silent */ }
    };

    const fetchSubsections = async (org) => {
      if (!org) return;
      try {
        const res = await axios.get(`${apiLink}/subsection`, {
          params: { organizationName: org.trim() },
          headers: getHeaders(),
          paramsSerializer: (p) => new URLSearchParams(p).toString().replace(/\+/g, '%20'),
        });
        subsections.value = res.data.data;
      } catch { subsections.value = []; }
    };

    function onOrgChange() {
      selectedSubsection.value = '';
      fetchSubsections(selectedOrganization.value);
    }

    const registerUser = async () => {
      if (submitting.value) return;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      submitting.value = true;

      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        tg.MainButton.setText(t('submitting'));
        tg.MainButton.showProgress(false);
      }

      try {
        const chatId = tg?.initDataUnsafe?.user?.id;
        await axios.post(`${apiLink}/user`, {
          chatId,
          fullName:      fullName.value,
          organization:  selectedOrganization.value,
          subsection:    selectedSubsection.value,
          cashRegister:  selectedCashRegister.value,
        }, { 
          headers: getHeaders(),
          timeout: 15000 
        });

        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        router.push('/sent');
      } catch {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
        showToast(t('errorMessage'), 'error');
        if (tg?.MainButton) {
          tg.MainButton.setText(t('submit'));
          tg.MainButton.hideProgress();
        }
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      const tg = window.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        fullName.value  = (user.first_name || '') + (user.last_name ? ' ' + user.last_name : '');
        profileImg.value = user.photo_url || '';
      }

      fetchOrganizations();
      fetchCashRegisters();

      // Setup Telegram MainButton
      if (tg?.MainButton) {
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
        tg.MainButton.setText(t('submit'));
        tg.MainButton.show();
        tg.MainButton.onClick(registerUser);
      }

      // BackButton
      if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => router.push('/'));
      }
    });

    onUnmounted(() => {
      const tg = window.Telegram?.WebApp;
      if (tg?.MainButton) {
        tg.MainButton.hideProgress();
        tg.MainButton.hide();
        tg.MainButton.offClick(registerUser);
      }
      tg?.BackButton?.hide();
    });

    return {
      t, fullName, profileImg, initials,
      selectedOrganization, selectedSubsection, selectedCashRegister,
      organizations, subsections, cashRegisters,
      submitting, hasTgMainButton, toast, haptic, onOrgChange, registerUser,
    };
  },
};
</script>

<style scoped>
.reg-page {
  min-height: 100dvh;
  background: var(--surface-1);
  padding: 32px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.reg-header { display: flex; flex-direction: column; align-items: center; gap: 14px; }

.reg-avatar { position: relative; }
.avatar-img {
  width: 72px; height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--surface-2);
}
.avatar-fallback {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: #16A34A;
  color: #fff;
  font-size: 24px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.reg-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

/* Form */
.reg-form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.select-wrap { position: relative; }
.select-wrap::after {
  content: '▾';
  position: absolute;
  right: 16px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
  font-size: 14px;
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
  font-family: var(--font);
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: border-color 150ms ease, background 150ms ease;
}
.field-input:focus {
  border-color: var(--brand-500);
  background: var(--surface-1);
}
.field-input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dimmed { opacity: 0.6; }

/* Submit */
.submit-btn {
  margin-top: 8px;
  height: 52px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, var(--gradient-start, #2563EB), var(--gradient-end, #6B21A8));
  color: #fff;
  font-size: 16px; font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 150ms ease;
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
