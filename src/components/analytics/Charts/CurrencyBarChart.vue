<template>
  <div v-if="currencies.length" style="padding:0 16px 16px">
    <div class="chart-title">Статуслар бўйича айланма / Оборот по статусам</div>
    <div class="chart-box">
      <div class="chart-wrap">
        <canvas ref="canvasRef" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Chart,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import { formatNumber, formatCompact, currencyLabel } from '@/utils/format';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps({
  byStatus:            { type: Array, default: () => [] },
  totalByCurrency:     { type: Array, default: () => [] },
  cancelledByCurrency: { type: Array, default: () => [] },
});

const STATUSES = [
  { key: 'Успешно', color: '#16A34A', label: 'Муваффақиятли' },
  { key: 'Отменен', color: '#DC2626', label: 'Бекор қилинган' },
  { key: 'Открыт',  color: '#F59E0B', label: 'Очиқ'          },
];

const currencies = computed(() => [
  ...new Set([
    ...(props.byStatus || []).map(d => d.currency),
    ...(props.totalByCurrency || []).map(d => d.currency),
  ]),
]);

function buildData() {
  const currs = currencies.value;
  const amountMap = {};
  (props.byStatus || []).forEach(({ status, currency, amount }) => {
    amountMap[`${currency}__${status}`] = amount;
  });
  return {
    labels: currs.map(c => currencyLabel(c)),
    datasets: STATUSES.map(({ key, color, label }) => ({
      label,
      data: currs.map(c => amountMap[`${c}__${key}`] ?? 0),
      backgroundColor: color,
    })),
  };
}

const canvasRef = ref(null);
let chartInstance = null;

function destroyChart() {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

function initChart() {
  destroyChart();
  if (!canvasRef.value) return;
  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: buildData(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, padding: 12, font: { size: 12 } },
        },
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
    },
  });
}

onMounted(initChart);
onUnmounted(destroyChart);

watch(
  [() => props.byStatus, () => props.totalByCurrency],
  () => {
    if (!chartInstance) { initChart(); return; }
    const d = buildData();
    chartInstance.data.labels   = d.labels;
    chartInstance.data.datasets = d.datasets;
    chartInstance.update('none');
  },
  { deep: true, flush: 'post' },
);
</script>

<style scoped>
.chart-title { font-size:13px; font-weight:600; color:var(--tg-theme-text-color,#000); margin-bottom:8px; }
.chart-box { background:var(--tg-theme-secondary-bg-color,#f5f5f5); border-radius:14px; padding:16px; }
.chart-wrap { position: relative; height: 200px; }
</style>
