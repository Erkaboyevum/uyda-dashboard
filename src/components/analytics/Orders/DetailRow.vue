<template>
  <div v-if="value !== null && value !== undefined && value !== ''" class="detail-row">
    <span class="row-label">{{ label }}</span>
    <span class="row-value">{{ String(value) }}</span>
  </div>
</template>

<script setup>
defineProps({ label: String, value: [String, Number, null] });
</script>

<style scoped>
.detail-row {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 8px 0; border-bottom: 1px solid rgba(128,128,128,0.1);
}
.row-label { font-size: 13px; color: var(--tg-theme-hint-color, #8E8E93); flex-shrink: 0; }
.row-value { font-size: 13px; color: var(--tg-theme-text-color, #000); text-align: right; word-break: break-word; }
</style>
