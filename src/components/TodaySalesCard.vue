<template>
  <div v-if="loading" class="today-card skeleton-shimmer" />
  <div v-else-if="data" class="today-card" :style="cardStyle" @click="$router.push('/app/savdo')">
    <div class="card-label">{{ t('analytics.todaySales') }}</div>
    <div class="card-stats">
      <span class="stat-main">{{ data.totalOrders }} {{ t('analytics.totalOrders') }}</span>
      <span class="stat-sep">·</span>
      <span class="stat-cancel">{{ cancelCount }} {{ t('analytics.cancelled') }}</span>
      <span class="stat-sep">·</span>
      <span class="stat-rate" :style="{ color: rateColor }">{{ data.cancelRate.toFixed(1) }}%</span>
    </div>
    <div class="card-hint">→ {{ t('tabs.analytics') }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTodayAnalytics } from '@/composables/useTodayAnalytics';

const { t } = useI18n();
const { data, loading } = useTodayAnalytics();

const cancelCount = computed(() =>
  data.value?.cancelledByCurrency?.reduce((s, c) => s + c.count, 0) ?? 0
);

const rateColor = computed(() => {
  const r = data.value?.cancelRate ?? 0;
  return r < 10 ? '#16A34A' : r < 20 ? '#F59E0B' : '#DC2626';
});

const cardStyle = computed(() => {
  const r = data.value?.cancelRate ?? 0;
  const bg = r < 10 ? '#F0FDF4' : r < 20 ? '#FFFBEB' : '#FEE2E2';
  const border = r < 10 ? '#16A34A' : r < 20 ? '#F59E0B' : '#DC2626';
  return {
    background: bg,
    borderLeft: `4px solid ${border}`,
    cursor: 'pointer',
  };
});
</script>

<style scoped>
.today-card {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 12px;
  transition: opacity 0.15s;
}
.today-card:active { opacity: 0.75; }
.card-label { font-size: 11px; font-weight: 600; color: #6B7280; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
.card-stats { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 14px; font-weight: 600; color: #111827; }
.stat-sep { color: #D1D5DB; }
.stat-cancel { color: #DC2626; }
.card-hint { font-size: 11px; color: #9CA3AF; margin-top: 5px; }
.skeleton-shimmer {
  height: 68px;
  border-radius: 12px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
