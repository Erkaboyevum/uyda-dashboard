<template>
  <div v-if="chartData.labels.length" style="padding:0 16px 16px">
    <div class="chart-title">Заказы по статусам</div>
    <div class="chart-box">
      <Doughnut :data="chartData" :options="chartOptions" style="max-height:220px" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getStatusBg } from '@/utils/statusColor';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps({ byStatus: { type: Array, default: () => [] } });

const aggregated = computed(() => {
  const map = {};
  for (const s of (props.byStatus || [])) {
    map[s.status] = (map[s.status] || 0) + s.count;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
});

const total = computed(() => aggregated.value.reduce((s, d) => s + d.value, 0));

const chartData = computed(() => ({
  labels: aggregated.value.map(d => d.name),
  datasets: [{
    data: aggregated.value.map(d => d.value),
    backgroundColor: aggregated.value.map(d => getStatusBg(d.name)),
    borderWidth: 0,
    hoverOffset: 4,
  }],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '55%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 12 } } },
    tooltip: {
      callbacks: {
        label: ctx => {
          const val = ctx.parsed;
          const pct = total.value > 0 ? ((val / total.value) * 100).toFixed(1) : '0';
          return `${ctx.label}: ${val} (${pct}%)`;
        },
      },
    },
  },
}));
</script>

<style scoped>
.chart-title { font-size:13px; font-weight:600; color:var(--tg-theme-text-color,#000); margin-bottom:8px; }
.chart-box { background:var(--tg-theme-secondary-bg-color,#f5f5f5); border-radius:14px; padding:16px; }
</style>
