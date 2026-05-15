<template>
  <div class="analytics-page">
    <!-- Sticky sub-tab switcher -->
    <div class="subtab-bar">
      <button
        class="subtab-btn"
        :class="{ active: activeTab === 'charts' }"
        @click="activeTab = 'charts'"
      >{{ t('analytics.tabCharts') }}</button>
      <button
        class="subtab-btn"
        :class="{ active: activeTab === 'orders' }"
        @click="activeTab = 'orders'"
      >{{ t('analytics.tabOrders') }}</button>
    </div>

    <!-- CHARTS TAB -->
    <div v-show="activeTab === 'charts'">
      <FilterPanel
        :loading="loading"
        :cancel-reasons="cancelReasons"
        :order-types="orderTypes"
        @apply="applyFilters"
        @reset="resetFilters"
      />

      <div v-if="error && !data" class="error-state">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <div class="error-msg">{{ error }}</div>
        <button class="action-btn" @click="refetch">{{ t('analytics.retry') }}</button>
      </div>

      <template v-if="loading && !data">
        <div class="skeleton-row">
          <CardSkeleton v-for="i in 3" :key="i" />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </template>

      <div v-if="!loading && !error && !data" class="empty-state">
        {{ t('analytics.empty') }}
      </div>

      <div v-if="data" :style="{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }">
        <SummaryCards :summary="data.summary" />
        <StatusDonut :by-status="data.summary.byStatus" />
        <CurrencyBarChart
          :by-status="data.summary.byStatus"
          :total-by-currency="data.summary.totalByCurrency"
          :cancelled-by-currency="data.summary.cancelledByCurrency"
        />
        <StackedStatusByCurrency :by-status="data.summary.byStatus" />
      </div>
    </div>

    <!-- ORDERS TAB -->
    <div v-show="activeTab === 'orders'">
      <OrderList
        :items="data?.items ?? []"
        :total-orders="data?.summary.totalOrders ?? 0"
        :loading="loading"
        :loading-more="loadingMore"
        :error="error"
        :has-more="hasMore"
        @load-more="loadMore"
        @retry="refetch"
      />
    </div>

    <div class="bottom-space" />
    <BottomBar />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useOrderAnalysis } from '@/composables/useOrderAnalysis';
import BottomBar from '@/components/BottomBar.vue';
import FilterPanel from '@/components/analytics/FilterPanel.vue';
import SummaryCards from '@/components/analytics/SummaryCards.vue';
import StatusDonut from '@/components/analytics/Charts/StatusDonut.vue';
import CurrencyBarChart from '@/components/analytics/Charts/CurrencyBarChart.vue';
import StackedStatusByCurrency from '@/components/analytics/Charts/StackedStatusByCurrency.vue';
import CardSkeleton from '@/components/analytics/Skeletons/CardSkeleton.vue';
import ChartSkeleton from '@/components/analytics/Skeletons/ChartSkeleton.vue';
import OrderList from '@/components/analytics/Orders/OrderList.vue';

const { t } = useI18n();
const activeTab = ref('charts');

const {
  data, loading, loadingMore, error, hasMore,
  cancelReasons, orderTypes,
  applyFilters, resetFilters, refetch, loadMore,
} = useOrderAnalysis();

</script>

<style scoped>
.analytics-page {
  min-height: 100vh;
  background: var(--tg-theme-bg-color, #fff);
}
.subtab-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  background: var(--tg-theme-bg-color, #fff);
  border-bottom: 1px solid rgba(128,128,128,0.12);
  padding: 8px 16px 0;
  gap: 4px;
}
.subtab-btn {
  flex: 1;
  padding: 9px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--tg-theme-hint-color, #8E8E93);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.subtab-btn.active {
  color: #2563EB;
  border-bottom-color: #2563EB;
}
.error-state { text-align: center; padding: 40px 16px; }
.error-msg { color: #DC2626; font-size: 14px; margin-bottom: 16px; }
.action-btn {
  padding: 12px 28px; border-radius: 12px; border: none;
  background: #2563EB;
  color: #fff;
  font-weight: 600; font-size: 15px; cursor: pointer; min-height: 44px;
}
.skeleton-row {
  display: flex; gap: 10px;
  padding: 12px 16px; overflow-x: auto; scrollbar-width: none;
}
.empty-state {
  text-align: center; padding: 48px;
  color: var(--tg-theme-hint-color, #8E8E93); font-size: 14px;
  background: #FEE2E2; border-radius: 12px; margin: 16px;
}
.bottom-space { height: 80px; }
</style>
