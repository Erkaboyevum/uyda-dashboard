<template>
  <div v-if="effectiveData.length" style="padding:0 16px 16px">
    <div class="chart-title">Статуслар бўйича айланма / Оборот по статусам</div>
    <div class="chart-box">
      <Bar :data="chartData" :options="chartOptions" style="max-height:220px" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import { formatNumber, formatCompact, currencyLabel } from '@/utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const props = defineProps({
  byStatus:           { type: Array, default: () => [] },
  totalByCurrency:    { type: Array, default: () => [] },
  cancelledByCurrency:{ type: Array, default: () => [] },
});

const STATUS_COLORS = {
  'Успешно': '#16A34A',
  'Отменен': '#DC2626',
  'Открыт':  '#F59E0B',
  'Всего':   '#6B7280',
};

const STATUS_LABELS = {
  'Успешно': 'Муваффақиятли',
  'Отменен': 'Бекор қилинган',
  'Открыт':  'Очиқ',
  'Всего':   'Жами',
};

// Use byStatus if it has data; otherwise derive 2-bar fallback from totalByCurrency
const effectiveData = computed(() => {
  const bs = props.byStatus || [];
  if (bs.length > 0) return bs;

  // Fallback: build from totalByCurrency + cancelledByCurrency
  const result = [];
  for (const t of (props.totalByCurrency || [])) {
    result.push({ status: 'Всего', currency: t.currency, count: t.count, amount: t.amount });
    const cancelled = (props.cancelledByCurrency || []).find(c => c.currency === t.currency);
    if (cancelled && cancelled.amount > 0) {
      result.push({ status: 'Отменен', currency: t.currency, count: cancelled.count, amount: cancelled.amount });
    }
  }
  return result;
});

const currencies = computed(() => [
  ...new Set(effectiveData.value.map(d => d.currency)),
]);

const statuses = computed(() => [
  ...new Set(effectiveData.value.map(d => d.status)),
]);

const amountMap = computed(() => {
  const map = {};
  effectiveData.value.forEach(({ status, currency, amount }) => {
    map[`${currency}__${status}`] = amount;
  });
  return map;
});

const chartData = computed(() => ({
  labels: currencies.value.map(c => currencyLabel(c)),
  datasets: statuses.value.map(status => ({
    label: STATUS_LABELS[status] || status,
    data: currencies.value.map(c => amountMap.value[`${c}__${status}`] ?? 0),
    backgroundColor: STATUS_COLORS[status] || '#8E8E93',
    borderRadius: 4,
  })),
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 12 } } },
    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 12 } } },
    y: {
      grid: { color: 'rgba(128,128,128,0.15)' },
      ticks: { font: { size: 11 }, callback: v => formatCompact(v) },
    },
  },
};
</script>

<style scoped>
.chart-title { font-size:13px; font-weight:600; color:var(--tg-theme-text-color,#000); margin-bottom:8px; }
.chart-box { background:var(--tg-theme-secondary-bg-color,#f5f5f5); border-radius:14px; padding:16px; }
</style>
