<template>
  <div class="filter-wrap">
    <button class="filter-toggle" @click="expanded = !expanded">
      <span>{{ t('analytics.filters') }}</span>
      <span class="toggle-arrow" :style="{ transform: expanded ? 'rotate(180deg)' : 'none' }">▲</span>
    </button>

    <div v-if="expanded" class="filter-body">
      <div class="date-grid">
        <div>
          <label class="field-label">С</label>
          <input type="date" class="field-input" :value="localDateFrom" @change="onDateFromChange" />
        </div>
        <div>
          <label class="field-label">По</label>
          <input type="date" class="field-input" :value="localDateTo" @change="onDateToChange" />
        </div>
      </div>

      <select class="field-input" v-model="localStatus">
        <option value="">Все</option>
        <option value="completed">Успешно</option>
        <option value="cancelled">Отменен</option>
        <option value="open">Открыт</option>
      </select>

      <select v-if="cancelReasons.length" class="field-input" v-model="localReasonCancel">
        <option value="">Все причины</option>
        <option v-for="r in cancelReasons" :key="r" :value="r">{{ r }}</option>
      </select>

      <select v-if="orderTypes.length" class="field-input" v-model="localOrderType">
        <option value="">Все типы</option>
        <option v-for="t in orderTypes" :key="t" :value="t">{{ t }}</option>
      </select>

      <div class="btn-grid">
        <button class="btn-reset" @click="handleReset">{{ t('analytics.reset') }}</button>
        <button class="btn-apply" :disabled="loading" @click="handleApply">
          {{ loading ? '...' : t('analytics.apply') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  loading: Boolean,
  cancelReasons: { type: Array, default: () => [] },
  orderTypes: { type: Array, default: () => [] },
});

const emit = defineEmits(['apply', 'reset']);

const expanded = ref(true);

function defaultDateFrom() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function defaultDateTo() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Local state — initialized once on mount, never overwritten by parent re-renders
const localDateFrom = ref(defaultDateFrom());
const localDateTo = ref(defaultDateTo());
const localStatus = ref('');
const localReasonCancel = ref('');
const localOrderType = ref('');

function onDateFromChange(e) {
  localDateFrom.value = e.target.value;
}

function onDateToChange(e) {
  localDateTo.value = e.target.value;
}

function handleApply() {
  emit('apply', {
    dateFrom: localDateFrom.value,
    dateTo: localDateTo.value,
    status: localStatus.value,
    reasonCancel: localReasonCancel.value,
    orderType: localOrderType.value,
  });
}

function handleReset() {
  localDateFrom.value = defaultDateFrom();
  localDateTo.value = defaultDateTo();
  localStatus.value = '';
  localReasonCancel.value = '';
  localOrderType.value = '';
  emit('reset');
}
</script>

<style scoped>
.filter-wrap {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--tg-theme-bg-color, #fff);
  border-bottom: 1px solid rgba(128,128,128,0.12);
}
.filter-toggle {
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--tg-theme-text-color, #000);
  font-size: 14px;
  font-weight: 600;
  user-select: none;
}
.toggle-arrow { font-size: 12px; color: var(--tg-theme-hint-color, #8E8E93); transition: transform 0.2s; display: inline-block; }
.filter-body { padding: 0 16px 14px; display: flex; flex-direction: column; gap: 10px; }
.date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.field-label { font-size: 11px; color: var(--tg-theme-hint-color, #8E8E93); display: block; margin-bottom: 4px; }
.field-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--tg-theme-bg-color, #fff);
  color: var(--tg-theme-text-color, #000);
  border: 1px solid rgba(128,128,128,0.25);
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
  appearance: none;
  outline: none;
}
.btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.btn-reset {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(128,128,128,0.3);
  background: transparent;
  color: var(--tg-theme-text-color, #000);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}
.btn-apply {
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: #2563EB;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}
.btn-apply:disabled { opacity: 0.6; cursor: default; }
</style>
