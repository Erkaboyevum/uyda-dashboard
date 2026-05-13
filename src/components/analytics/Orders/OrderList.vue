<template>
  <div style="padding:12px 16px">
    <div class="search-wrap">
      <input
        v-model="search"
        type="search"
        :placeholder="t('analytics.search')"
        class="search-input"
      />
    </div>

    <template v-if="loading && !items.length">
      <div v-for="i in 5" :key="i" class="skeleton-shimmer" style="height:110px;border-radius:14px;margin-bottom:8px" />
    </template>

    <div v-if="error && !loading" class="error-state">
      <div style="font-size:36px;margin-bottom:12px">⚠️</div>
      <div class="error-msg">{{ error }}</div>
      <button class="retry-btn" @click="$emit('retry')">{{ t('analytics.retry') }}</button>
    </div>

    <div v-if="!loading && !error && filtered.length === 0" class="empty-state">
      {{ t('analytics.empty') }}
    </div>

    <OrderCard
      v-for="order in filtered"
      :key="order.id"
      :order="order"
      @click="selected = order"
    />

    <div v-if="!search && items.length > 0" class="count-info">
      {{ t('analytics.shown') }} {{ items.length }} {{ t('analytics.of') }} {{ totalOrders }}
    </div>

    <button
      v-if="!search && hasMore"
      :disabled="loadingMore"
      class="load-more-btn"
      @click="$emit('loadMore')"
    >
      {{ loadingMore ? '...' : t('analytics.loadMore') }}
    </button>

    <OrderDetailSheet :order="selected" @close="selected = null" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import OrderCard from './OrderCard.vue';
import OrderDetailSheet from './OrderDetailSheet.vue';

const { t } = useI18n();

const props = defineProps({
  items: { type: Array, default: () => [] },
  totalOrders: { type: Number, default: 0 },
  loading: Boolean,
  loadingMore: Boolean,
  error: String,
  hasMore: Boolean,
});

defineEmits(['loadMore', 'retry']);

const search = ref('');
const selected = ref(null);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.items;
  return props.items.filter(o =>
    o.number.toLowerCase().includes(q) ||
    o.counterparty?.toLowerCase().includes(q) ||
    o.recipient?.some(r =>
      r.fullName?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q)
    )
  );
});
</script>

<style scoped>
.search-wrap {
  position: sticky; top: 0;
  background: var(--tg-theme-bg-color, #fff);
  padding-bottom: 10px; z-index: 10;
}
.search-input {
  width: 100%; padding: 10px 14px;
  background: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #000);
  border: none; border-radius: 12px; font-size: 14px;
  box-sizing: border-box; outline: none; min-height: 44px;
}
.error-state { text-align: center; padding: 32px 16px; }
.error-msg { color: #DC2626; font-size: 14px; margin-bottom: 16px; }
.retry-btn {
  padding: 12px 28px; border-radius: 12px; border: none;
  background: #2563EB; color: #fff;
  font-weight: 600; font-size: 15px; cursor: pointer; min-height: 44px;
}
.empty-state {
  text-align: center; padding: 32px 16px;
  background: #FEE2E2; border-radius: 12px;
  color: #991B1B; font-size: 14px;
}
.count-info { text-align: center; font-size: 12px; color: var(--tg-theme-hint-color, #8E8E93); padding: 8px 0; }
.load-more-btn {
  width: 100%; padding: 13px; margin-top: 8px; margin-bottom: 12px;
  background: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: #2563EB;
  border: none; border-radius: 14px; font-size: 15px; font-weight: 600;
  cursor: pointer; min-height: 44px;
}
.load-more-btn:disabled { opacity: 0.6; cursor: default; }
.skeleton-shimmer {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
