<template>
  <div v-if="chartData.labels.length" style="padding:0 16px 16px">
    <div class="chart-title">Сумма по валютам</div>
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
import { currencyLabel, formatNumber, formatCompact } from '@/utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const props = defineProps({ totalByCurrency: Array, cancelledByCurrency: Array });

const currencies = computed(() => [
  ...new Set([
    ...props.totalByCurrency.map(c => c.currency),
    ...props.cancelledByCurrency.map(c => c.currency),
  ]),
]);

const chartData = computed(() => ({
  labels: currencies.value.map(c => currencyLabel(c)),
  datasets: [
    {
      label: 'Всего',
      data: currencies.value.map(c => props.totalByCurrency.find(x => x.currency === c)?.amount ?? 0),
      backgroundColor: 'var(--tg-theme-button-color, #007AFF)',
      borderRadius: 4,
    },
    {
      label: 'Отменено',
      data: currencies.value.map(c => props.cancelledByCurrency.find(x => x.currency === c)?.amount ?? 0),
      backgroundColor: '#FF3B30',
      borderRadius: 4,
    },
  ],
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
