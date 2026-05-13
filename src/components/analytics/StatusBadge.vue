<template>
  <span :style="badgeStyle">{{ status || '—' }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { getStatusBg } from '@/utils/statusColor';

const props = defineProps({ status: String });

const badgeStyle = computed(() => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  background: getStatusBg(props.status),
  color: '#fff',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}));
</script>
