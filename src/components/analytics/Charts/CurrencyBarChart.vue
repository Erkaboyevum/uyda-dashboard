<template>
  <div v-if="currencies.length" style="padding:0 16px 16px">
    <div class="chart-title">Статуслар бўйича айланма / Оборот по статусам</div>
    <div class="chart-box">
      <div class="chart-wrap">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
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

// Fixed status order — always shown, 0 if absent in current date range
const STATUSES = [
  { key: 'Успешно', color: '#16A34A', label: 'Муваффақиятли' },
  { key: 'Отменен', color: '#DC2626', label: 'Бекор қилинган' },
  { key: 'Открыт',  color: '#F59E0B', label: 'Очиқ'          },
];

// All currencies present in byStatus OR totalByCurrency (fallback)
const currencies = computed(() => {
  const fromByStatus = (props.byStatus || []).map(d => d.currency);
  const fromTotal = (props.totalByCurrency || []).map(d => d.currency);
  return [...new Set([...fromByStatus, ...fromTotal])];
});

const amountMap = computed(() => {
  const map = {};
  (props.byStatus || []).forEach(({ status, currency, amount }) => {
    map[`${currency}__${status}`] = amount;
  });
  return map;
});

const chartData = computed(() => ({
  labels: currencies.value.map(c => currencyLabel(c)),
  datasets: STATUSES.map(({ key, color, label }) => ({
    label,
    data: currencies.value.map(c => amountMap.value[`${c}__${key}`] ?? 0),
    backgroundColor: color,
    borderRadius: 0,
  })),
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
.chart-wrap { position:relative; height:180px; }
</style>
