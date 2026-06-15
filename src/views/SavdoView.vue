<template>
  <div class="savdo-page">
    <!-- ── Segmented Control ── -->
    <div class="seg-wrap">
      <div class="seg-control">
        <button
          class="seg-btn"
          :class="{ active: activeTab === 'analytics' }"
          @click="activateTab('analytics')"
        >{{ t('savdo.analytics') }}</button>
        <button
          class="seg-btn"
          :class="{ active: activeTab === 'orders' }"
          @click="activateTab('orders')"
        >{{ t('savdo.orders') }}</button>
        <button
          class="seg-btn"
          :class="{ active: activeTab === 'flyer' }"
          @click="activateTab('flyer')"
        >{{ t('savdo.flyer') }}</button>
      </div>
    </div>

    <!-- ── АНАЛИТИКА TAB ── -->
    <div v-show="activeTab === 'analytics'">
      <FilterPanel
        :filters="pendingFilters"
        :loading="loading"
        :cancel-reasons="cancelReasons"
        :order-types="orderTypes"
        @update:filters="v => { pendingFilters.value = v }"
        @apply="applyFilters"
        @reset="resetFilters"
      />

      <div v-if="error && !data" class="error-state">
        <div class="error-emoji">⚠️</div>
        <div class="error-msg">{{ error }}</div>
        <button class="action-btn" @click="refetch">{{ t('analytics.retry') }}</button>
      </div>

      <div v-if="loading && !data" class="skel-area">
        <div class="skel-row">
          <CardSkeleton v-for="i in 3" :key="i" />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div v-if="!loading && !error && !data" class="empty-state">
        <div class="empty-emoji">📊</div>
        <div class="empty-msg">{{ t('analytics.empty') }}</div>
      </div>

      <div v-if="data" :style="{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }">
        <SummaryCards :summary="data.summary" />
        <StatusDonut :by-status="data.summary.byStatus" />
        <CurrencyBarChart
          :total-by-currency="data.summary.totalByCurrency"
          :cancelled-by-currency="data.summary.cancelledByCurrency"
        />
        <StackedStatusByCurrency :by-status="data.summary.byStatus" />
      </div>
    </div>

    <!-- ── БУЮРТМАЛАР TAB ── -->
    <div v-show="activeTab === 'orders'">
      <OrderList
        :items="data?.items ?? []"
        :total-orders="data?.summary?.totalOrders ?? 0"
        :loading="loading"
        :loading-more="loadingMore"
        :error="error"
        :has-more="hasMore"
        @load-more="loadMore"
        @retry="refetch"
      />
    </div>

    <!-- ── ФЛАЙЕР TAB ── -->
    <div v-show="activeTab === 'flyer'" class="flyer-tab">
      <div class="flyer-empty">
        <div class="flyer-emoji">🎟️</div>
        <div class="flyer-title">{{ t('flyer.createFlyer') }}</div>
        <div class="flyer-hint">{{ t('flyer.tabHint') }}</div>
      </div>
      <button class="fab" :aria-label="t('flyer.addFlyer')" @click="goCreateFlyer">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useOrderAnalysis } from '@/composables/useOrderAnalysis';

import FilterPanel             from '@/components/analytics/FilterPanel.vue';
import SummaryCards            from '@/components/analytics/SummaryCards.vue';
import StatusDonut             from '@/components/analytics/Charts/StatusDonut.vue';
import CurrencyBarChart        from '@/components/analytics/Charts/CurrencyBarChart.vue';
import StackedStatusByCurrency from '@/components/analytics/Charts/StackedStatusByCurrency.vue';
import CardSkeleton            from '@/components/analytics/Skeletons/CardSkeleton.vue';
import ChartSkeleton           from '@/components/analytics/Skeletons/ChartSkeleton.vue';
import OrderList               from '@/components/analytics/Orders/OrderList.vue';
const { t } = useI18n();
const router = useRouter();

const activeTab = ref('analytics');

function goCreateFlyer() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
  router.push('/flyer/new');
}

function activateTab(tab) {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  activeTab.value = tab;
}

const {
  data, loading, loadingMore, error, hasMore,
  pendingFilters, cancelReasons, orderTypes,
  applyFilters, resetFilters, refetch, loadMore,
} = useOrderAnalysis();
</script>

<style scoped>
.savdo-page {
  min-height: 100%;
  background: var(--surface-1);
}

/* ── Segmented control ── */
.seg-wrap {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 10px 16px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-subtle);
}

.seg-control {
  display: flex;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 4px;
  gap: 2px;
}

.seg-btn {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font);
  transition: all 200ms ease;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.seg-btn.active {
  background: var(--surface-1);
  color: var(--text-primary);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* ── Error / Empty ── */
.error-state  { text-align: center; padding: 40px 16px; }
.error-emoji  { font-size: 36px; margin-bottom: 12px; }
.error-msg    { color: #DC2626; font-size: 14px; margin-bottom: 16px; }

.empty-state { text-align: center; padding: 48px 16px; }
.empty-emoji { font-size: 40px; margin-bottom: 12px; }
.empty-msg   { color: var(--text-secondary); font-size: 15px; }

.action-btn {
  height: 44px; padding: 0 28px;
  border-radius: 12px; border: none;
  background: var(--brand-500); color: #fff;
  font-weight: 600; font-size: 15px;
  cursor: pointer; font-family: var(--font);
}

/* ── Skeleton ── */
.skel-area { padding: 8px; }
.skel-row {
  display: flex; gap: 10px;
  padding: 12px 16px; overflow-x: auto; scrollbar-width: none;
}

/* ── Flyer tab ── */
.flyer-tab { position: relative; min-height: 300px; }
.flyer-empty {
  text-align: center;
  padding: 56px 24px 120px;
}
.flyer-emoji { font-size: 48px; margin-bottom: 14px; }
.flyer-title {
  font-size: 18px; font-weight: 700;
  color: var(--text-primary); margin-bottom: 8px;
}
.flyer-hint { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }

/* ── FAB (flyer tab only) ── */
.fab {
  position: fixed;
  right: 20px;
  bottom: calc(var(--bar-h, 64px) + var(--sab, 0px) + 20px);
  width: 56px; height: 56px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563EB 0%, #6B21A8 100%);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(37,99,235,0.45);
  cursor: pointer;
  z-index: 50;
  -webkit-tap-highlight-color: transparent;
  transition: transform 150ms ease, box-shadow 200ms ease;
}
.fab:active {
  transform: scale(0.92);
  box-shadow: 0 4px 14px rgba(37,99,235,0.40);
}
</style>
