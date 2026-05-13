<template>
  <div class="docs-page">

    <!-- ── Balance card ── -->
    <div v-if="!profileLoading" class="balance-card">
      <div class="balance-header">
        <span class="balance-label">БАЛАНС</span>
        <span class="balance-register">{{ cashRegisterName }}</span>
      </div>
      <div class="balance-amount">{{ displayBalance }}</div>
      <div class="balance-currency">сум</div>
    </div>
    <div v-else class="balance-card-skel skeleton" />

    <!-- ── Today sales ── -->
    <TodaySalesCard v-if="canAccessAnalytics()" class="today-wrap" />

    <!-- ── Section header ── -->
    <div class="section-bar">
      <span class="section-title">{{ t('recentDocuments') }}</span>
    </div>

    <!-- ── Skeleton list ── -->
    <div v-if="loading" class="doc-list">
      <div v-for="i in 6" :key="i" class="doc-card-skel skeleton" />
    </div>

    <!-- ── Error ── -->
    <div v-else-if="errorMessage" class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-msg">{{ errorMessage }}</div>
    </div>

    <!-- ── Document list ── -->
    <TransitionGroup
      v-else
      name="card-list"
      tag="div"
      class="doc-list"
    >
      <div
        v-for="(doc, i) in documents"
        :key="'doc_' + i"
        class="doc-card"
        :style="{ transitionDelay: `${Math.min(i, 10) * 40}ms` }"
      >
        <div class="doc-icon-wrap" :class="iconBg(doc.documentType)">
          <span class="doc-icon-glyph">{{ docIcon(doc.documentType) }}</span>
        </div>
        <div class="doc-body">
          <div class="doc-type-label">{{ docLabel(doc.documentType) }}</div>
          <div v-if="doc.comment" class="doc-comment">{{ doc.comment }}</div>
          <div class="doc-meta">{{ doc.operation }}</div>
        </div>
        <div class="doc-right">
          <div class="doc-amount" :class="amountColor(doc.documentType)">
            {{ formatNumber(doc.sum) }}
          </div>
          <div class="doc-curr">{{ doc.currencyType }}</div>
        </div>
      </div>
    </TransitionGroup>

    <!-- ── Empty state ── -->
    <div v-if="!loading && !errorMessage && documents.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-msg">{{ t('documentsNotFound') }}</div>
      <div class="empty-hint">{{ t('addDocumentHint') }}</div>
    </div>

    <div class="bottom-space" />

    <!-- ── FAB ── -->
    <router-link
      to="/addDocument"
      class="fab"
      aria-label="Ҳужжат яратиш"
      @click.native="fabHaptic"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </router-link>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import apiLink from '@/config/api';
import { useCurrentUser } from '@/composables/useCurrentUser';
import TodaySalesCard from '@/components/TodaySalesCard.vue';

export default {
  name: 'DocumentsView',
  components: { TodaySalesCard },
  setup() {
    const { t }  = useI18n();
    const { setUser, canAccessAnalytics } = useCurrentUser();

    const documents     = ref([]);
    const loading       = ref(true);
    const profileLoading = ref(true);
    const errorMessage  = ref('');
    const chatId        = ref(null);
    const cashRegisterName = ref('');
    const rawBalance    = ref(0);
    const displayBalance = ref('0');

    function startCountUp(target) {
      const duration  = 600;
      const startTime = performance.now();
      function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(target * eased);
        displayBalance.value = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
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
        const d = res.data?.data;
        if (d) {
          cashRegisterName.value = d.cashRegister || '';
          rawBalance.value = Number(d.cashRegisterBalance) || 0;
          startCountUp(rawBalance.value);
          setUser(d);
        }
      } catch {
        // non-critical
      } finally {
        profileLoading.value = false;
      }
    };

    const fetchDocuments = async () => {
      try {
        const res = await axios.get(`${apiLink}/document`, {
          params: { chatId: chatId.value },
          headers: getHeaders(),
        });
        if (res.data?.Code === '200') {
          documents.value = res.data.message || [];
        } else {
          errorMessage.value = t('documentsNotFound');
        }
      } catch (err) {
        const status = err.response?.status ?? err.status;
        if (status === 404)      errorMessage.value = t('documentsNotFound');
        else if (status === 401) errorMessage.value = t('noAccess');
        else                     errorMessage.value = t('connectionError');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        chatId.value = window.Telegram.WebApp.initDataUnsafe.user.id;
        fetchUserProfile();
        fetchDocuments();
      } else {
        profileLoading.value = false;
        loading.value        = false;
        errorMessage.value   = t('userNotFound');
      }
    });

    function formatNumber(v) {
      if (!v) return '0';
      return new Intl.NumberFormat('uz-UZ').format(v);
    }

    function docLabel(type) {
      const map = { Расход: t('Расход'), Приход: t('Приход'), Перемещение: t('Перемещение') };
      return map[type] ?? type;
    }

    function docIcon(type) {
      if (type === 'Приход')      return '↓';
      if (type === 'Расход')      return '↑';
      if (type === 'Перемещение') return '⇄';
      return '•';
    }

    function iconBg(type) {
      if (type === 'Приход')      return 'bg-income';
      if (type === 'Расход')      return 'bg-expense';
      if (type === 'Перемещение') return 'bg-transfer';
      return 'bg-neutral';
    }

    function amountColor(type) {
      if (type === 'Приход')      return 'amt-income';
      if (type === 'Расход')      return 'amt-expense';
      return 'amt-neutral';
    }

    function fabHaptic() {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    }

    return {
      documents, loading, profileLoading, errorMessage,
      cashRegisterName, displayBalance,
      formatNumber, docLabel, docIcon, iconBg, amountColor,
      canAccessAnalytics, fabHaptic, t,
    };
  },
};
</script>

<style scoped>
.docs-page {
  padding-bottom: 16px;
  background: var(--surface-1);
  min-height: 100%;
}

/* ── Balance card ── */
.balance-card {
  margin: 16px 16px 0;
  background: linear-gradient(135deg, #2563EB 0%, #6B21A8 100%);
  border-radius: 20px;
  padding: 20px 20px 18px;
  color: #fff;
  box-shadow: 0 8px 32px rgba(37, 99, 235, 0.22);
}
.balance-card-skel {
  margin: 16px 16px 0;
  height: 108px;
  border-radius: 20px;
}
.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.balance-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.2px;
  opacity: 0.75;
}
.balance-register {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.balance-amount {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.balance-currency {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.75;
  margin-top: 4px;
}

/* ── Today card ── */
.today-wrap { margin: 12px 16px 0; }

/* ── Section bar ── */
.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Skeleton list ── */
.doc-list { display: flex; flex-direction: column; gap: 10px; padding: 0 16px; }
.doc-card-skel { height: 72px; border-radius: 14px; }

/* ── Document cards ── */
.doc-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 14px;
  transition: transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.doc-card:active { transform: scale(0.98); }

.doc-icon-wrap {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.bg-income   { background: #DCFCE7; color: #15803D; }
.bg-expense  { background: #FEE2E2; color: #B91C1C; }
.bg-transfer { background: #DBEAFE; color: #1D4ED8; }
.bg-neutral  { background: var(--surface-2); color: var(--text-secondary); }

.doc-body { flex: 1; min-width: 0; }
.doc-type-label {
  font-size: 15px; font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}
.doc-comment {
  font-size: 13px; color: var(--text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 2px;
}
.doc-meta {
  font-size: 12px; color: var(--text-secondary);
  margin-top: 2px;
}

.doc-right { text-align: right; flex-shrink: 0; }
.doc-amount {
  font-size: 15px; font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}
.amt-income   { color: #15803D; }
.amt-expense  { color: #B91C1C; }
.amt-neutral  { color: var(--text-primary); }
.doc-curr { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

/* ── Empty state ── */
.empty-state { text-align: center; padding: 56px 16px; }
.empty-icon  { font-size: 44px; margin-bottom: 12px; }
.empty-msg   { font-size: 15px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.empty-hint  { font-size: 13px; color: var(--text-secondary); }

/* ── FAB ── */
.fab {
  position: fixed;
  right: 16px;
  bottom: calc(var(--bar-h) + var(--sab) + 16px);
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
  z-index: 80;
  text-decoration: none;
  will-change: transform;
  transition: transform 150ms ease, box-shadow 150ms ease;
  -webkit-tap-highlight-color: transparent;
}
.fab:active {
  transform: scale(0.90);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.bottom-space { height: 24px; }

/* ── Card list animation ── */
.card-list-enter-active {
  transition: opacity 350ms ease, transform 350ms ease;
}
.card-list-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
</style>
