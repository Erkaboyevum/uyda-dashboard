<template>
  <div v-if="chartData.labels.length" style="padding:0 16px 16px">
    <div class="chart-title">Статуслар бўйича айланма / Оборот по статусам</div>
    <div class="chart-box">
      <Bar :data="chartData" :options="chartOptions" style="max-height:200px" />
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

const STATUSES = [
  { key: 'Успешно', color: '#16A34A', label: 'Муваффақиятли' },
  { key: 'Отменен', color: '#DC2626', label: 'Бекор қилинган' },
  { key: 'Открыт',  color: '#F59E0B', label: 'Очиқ'          },
];

const props = defineProps({
  byStatus:            { type: Array, default: () => [] },
  totalByCurrency:     { type: Array, default: () => [] },
  cancelledByCurrency: { type: Array, default: () => [] },
});

const currencies = computed(() => [
  ...new Set([
    ...(props.byStatus || []).map(d => d.currency),
    ...(props.totalByCurrency || []).map(d => d.currency),
  ]),
]);

const chartData = computed(() => ({
  labels: currencies.value.map(c => currencyLabel(c)),
  datasets: STATUSES.map(({ key, color, label }) => ({
    label,
    data: currencies.value.map(cur => {
      const found = (props.byStatus || []).find(s => s.currency === cur && s.status === key);
      return found?.amount ?? 0;
    }),
    backgroundColor: color,
    borderRadius: 0,
  })),
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 12 } } },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}`,
      },
    },
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
