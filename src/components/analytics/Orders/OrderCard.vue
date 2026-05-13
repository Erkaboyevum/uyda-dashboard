<template>
  <div class="order-card" @click="$emit('click')">
    <div class="card-header">
      <span class="order-num">№{{ order.number }}</span>
      <StatusBadge :status="order.status" />
    </div>
    <div class="card-date">{{ formatDate(order.date) }}</div>
    <div class="card-party">{{ order.counterparty || '—' }}</div>
    <div class="card-amount">{{ formatAmount(order.amount, order.currency) }}</div>
    <div v-if="order.status === 'Отменен' && order.cancelReason" class="card-cancel">
      {{ order.cancelReason }}
    </div>
    <div v-if="firstRecipient" class="card-recipient">
      👤 {{ firstRecipient.fullName }} • {{ firstRecipient.phone }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import StatusBadge from '../StatusBadge.vue';
import { formatDate, formatAmount } from '@/utils/format';

const props = defineProps({ order: Object });
defineEmits(['click']);

const firstRecipient = computed(() => props.order.recipient?.[0] ?? null);
</script>

<style scoped>
.order-card {
  background: var(--tg-theme-secondary-bg-color, #f5f5f5);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  margin-bottom: 8px;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: opacity 0.15s;
}
.order-card:active { opacity: 0.7; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
.order-num { font-size: 13px; font-weight: 700; color: var(--tg-theme-text-color, #000); }
.card-date { font-size: 11px; color: var(--tg-theme-hint-color, #8E8E93); margin-bottom: 4px; }
.card-party { font-size: 14px; font-weight: 500; color: var(--tg-theme-text-color, #000); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-amount { font-size: 15px; font-weight: 700; color: var(--tg-theme-text-color, #000); margin-bottom: 4px; }
.card-cancel { font-size: 12px; color: #FF3B30; margin-bottom: 4px; }
.card-recipient { font-size: 12px; color: var(--tg-theme-hint-color, #8E8E93); }
</style>
