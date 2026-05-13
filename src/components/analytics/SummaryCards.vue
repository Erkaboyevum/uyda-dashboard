<template>
  <div class="summary-scroll">
    <div class="summary-card">
      <div class="card-label">Всего заказов</div>
      <div class="card-value">{{ summary.totalOrders }}</div>
    </div>
    <div class="summary-card" style="border-left:3px solid #FF3B30">
      <div class="card-label">Отменено</div>
      <div class="card-value" style="color:#FF3B30">{{ cancelCount }}</div>
    </div>
    <div class="summary-card" :style="{ borderLeft: `3px solid ${rateColor}` }">
      <div class="card-label">Cancel rate</div>
      <div class="card-value" :style="{ color: rateColor }">{{ summary.cancelRate.toFixed(1) }}%</div>
    </div>
    <div
      v-for="c in summary.totalByCurrency"
      :key="c.currency"
      class="summary-card"
      style="border-left:3px solid var(--tg-theme-button-color, #007AFF)"
    >
      <div class="card-label">Оборот ({{ currencyLabel(c.currency) }})</div>
      <div class="card-value">{{ formatNumber(c.amount) }}</div>
      <div v-if="cancelledFor(c.currency)" class="card-sub">
        Отменено: {{ formatNumber(cancelledFor(c.currency).amount) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatNumber, currencyLabel } from '@/utils/format';

const props = defineProps({ summary: Object });

const cancelCount = computed(() =>
  props.summary.cancelledByCurrency.reduce((s, c) => s + c.count, 0)
);

const rateColor = computed(() => {
  const r = props.summary.cancelRate;
  return r > 20 ? '#FF3B30' : r > 10 ? '#FF9500' : '#34C759';
});

function cancelledFor(currency) {
  return props.summary.cancelledByCurrency.find(x => x.currency === currency);
}
</script>

<style scoped>
.summary-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 12px 16px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.summary-scroll::-webkit-scrollbar { display: none; }
.summary-card {
  min-width: 150px;
  padding: 14px 16px;
  background: var(--tg-theme-secondary-bg-color, #f5f5f5);
  border-radius: 14px;
  flex-shrink: 0;
}
.card-label { font-size: 11px; color: var(--tg-theme-hint-color, #8E8E93); margin-bottom: 6px; }
.card-value { font-size: 22px; font-weight: 700; color: var(--tg-theme-text-color, #000); line-height: 1; }
.card-sub { font-size: 11px; color: var(--tg-theme-hint-color, #8E8E93); margin-top: 5px; }
</style>
