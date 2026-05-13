<template>
  <template v-if="order">
    <div class="overlay" @click="$emit('close')" />
    <div class="sheet">
      <div class="drag-handle-wrap">
        <div class="drag-handle" />
      </div>

      <div class="sheet-header">
        <div class="sheet-title-row">
          <span class="sheet-order-num">№{{ order.number }}</span>
          <StatusBadge :status="order.status" />
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="sheet-body">
        <section class="detail-section">
          <div class="section-title">Основное</div>
          <DetailRow label="Дата" :value="formatDate(order.date)" />
          <DetailRow label="Клиент" :value="order.counterparty || '—'" />
          <DetailRow label="Сумма" :value="formatAmount(order.amount, order.currency)" />
          <DetailRow label="Тип заказа" :value="order.orderType || null" />
        </section>

        <section class="detail-section">
          <div class="section-title">Доставка</div>
          <DetailRow label="Тип доставки" :value="order.deliveryType || null" />
          <DetailRow label="Дата доставки" :value="order.shipmentDate ? formatDateShort(order.shipmentDate) : null" />
          <DetailRow label="Адрес" :value="order.address || null" />
          <DetailRow label="Трек-номер" :value="order.trackNumber || null" />
        </section>

        <section class="detail-section">
          <div class="section-title">Оплата</div>
          <DetailRow label="Тип оплаты" :value="order.paymentType || null" />
        </section>

        <section v-if="order.recipient?.length" class="detail-section">
          <div class="section-title">Получатели</div>
          <div v-for="(r, i) in order.recipient" :key="i" class="recipient-row">
            <div class="recipient-name">{{ r.fullName }}</div>
            <a :href="`tel:${r.phone}`" class="recipient-phone">{{ r.phone }}</a>
          </div>
        </section>

        <section v-if="hasLocation" class="detail-section">
          <div class="section-title">Локация</div>
          <div class="location-coords">{{ order.latitude }}, {{ order.longitude }}</div>
          <button class="map-btn" @click="openMap">📍 {{ t('analytics.openMap') }}</button>
        </section>

        <section v-if="order.status === 'Отменен' && order.cancelReason" class="detail-section">
          <div class="section-title">Отмена</div>
          <div class="cancel-reason">{{ order.cancelReason }}</div>
        </section>
      </div>
    </div>
  </template>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import StatusBadge from '../StatusBadge.vue';
import DetailRow from './DetailRow.vue';
import { formatDate, formatDateShort, formatAmount } from '@/utils/format';

const { t } = useI18n();

const props = defineProps({ order: Object });
const emit = defineEmits(['close']);

const hasLocation = computed(() => Boolean(props.order?.latitude && props.order?.longitude));

function openMap() {
  if (!hasLocation.value) return;
  const url = `https://www.google.com/maps?q=${props.order.latitude},${props.order.longitude}`;
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

watch(() => props.order, (val) => {
  document.body.style.overflow = val ? 'hidden' : '';
  const tg = window.Telegram?.WebApp;
  if (val) {
    tg?.HapticFeedback?.impactOccurred('light');
    tg?.BackButton?.show();
    tg?.BackButton?.onClick(() => emit('close'));
  } else {
    tg?.BackButton?.hide();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  animation: fadeIn 0.2s;
}
.sheet {
  position: fixed; bottom: 0; left: 0; right: 0;
  max-height: 90vh;
  background: var(--tg-theme-bg-color, #fff);
  border-radius: 20px 20px 0 0;
  z-index: 201;
  display: flex; flex-direction: column;
  animation: slideUp 0.25s ease-out;
}
.drag-handle-wrap { display: flex; justify-content: center; padding: 12px 0 4px; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(128,128,128,0.3); }
.sheet-header {
  padding: 8px 20px 12px;
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0;
}
.sheet-title-row { display: flex; align-items: center; gap: 10px; }
.sheet-order-num { font-size: 17px; font-weight: 700; color: var(--tg-theme-text-color, #000); }
.close-btn {
  width: 32px; height: 32px; border-radius: 16px; border: none;
  background: var(--tg-theme-secondary-bg-color, #f5f5f5);
  cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  color: var(--tg-theme-hint-color, #8E8E93);
}
.sheet-body {
  overflow-y: auto; flex: 1;
  padding: 4px 20px;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}
.detail-section { margin-bottom: 20px; }
.section-title {
  font-size: 11px; font-weight: 600;
  color: var(--tg-theme-hint-color, #8E8E93);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.recipient-row { padding: 8px 0; border-bottom: 1px solid rgba(128,128,128,0.1); }
.recipient-name { font-size: 13px; color: var(--tg-theme-text-color, #000); margin-bottom: 3px; }
.recipient-phone { font-size: 13px; color: var(--tg-theme-link-color, #007AFF); text-decoration: none; }
.location-coords { font-size: 13px; color: var(--tg-theme-hint-color, #8E8E93); margin-bottom: 10px; }
.map-btn {
  width: 100%; padding: 13px; border-radius: 14px; border: none;
  background: var(--tg-theme-button-color, #007AFF);
  color: var(--tg-theme-button-text-color, #fff);
  font-weight: 600; font-size: 15px; cursor: pointer; min-height: 44px;
}
.cancel-reason { font-size: 13px; color: #FF3B30; padding: 8px 0; }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
</style>
