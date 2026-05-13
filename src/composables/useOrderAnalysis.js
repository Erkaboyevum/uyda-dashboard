import { ref, computed } from 'vue';
import { ANALYTICS_API_URL, ANALYTICS_AUTH_HEADER } from '@/config/analyticsApi';

const LIMIT = 50;

function getDefaultFilters() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const fmt = d => d.toISOString().split('T')[0];
  return { dateFrom: fmt(from), dateTo: fmt(today), status: '', reasonCancel: '', orderType: '' };
}

// Singleton state — shared across all components that call useOrderAnalysis()
const appliedFilters = ref(getDefaultFilters());
const pendingFilters = ref(getDefaultFilters());
const data = ref(null);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref(null);
const cancelReasons = ref([]);
const orderTypes = ref([]);
let offset = 0;
let initialized = false;

export function useOrderAnalysis() {

  function buildUrl(filters, off) {
    const p = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) p.set('dateTo', filters.dateTo);
    if (filters.status) p.set('status', filters.status);
    if (filters.reasonCancel) p.set('reasonCancel', filters.reasonCancel);
    if (filters.orderType) p.set('orderType', filters.orderType);
    return `${ANALYTICS_API_URL}?${p}`;
  }

  async function fetchData(filters, reset) {
    const off = reset ? 0 : offset;
    if (reset) loading.value = true;
    else loadingMore.value = true;
    error.value = null;
    try {
      const res = await fetch(buildUrl(filters, off), {
        headers: { Authorization: ANALYTICS_AUTH_HEADER },
      });
      const json = await res.json();

      // Handle both { responseCode, data } and bare response shapes
      if (json.responseCode !== undefined && json.responseCode !== 200) {
        throw new Error(json.errorMessage || `Аналитика хатоси (${json.responseCode})`);
      }
      if (!res.ok) throw new Error(json.errorMessage || `HTTP ${res.status}`);

      const payload = json.data ?? json;
      if (!payload?.summary) throw new Error('Нет данных от сервера');

      const newReasons = payload.items.map(i => i.cancelReason).filter(r => r?.trim());
      const newTypes = payload.items.map(i => i.orderType).filter(t => t?.trim());
      cancelReasons.value = [...new Set([...cancelReasons.value, ...newReasons])];
      orderTypes.value = [...new Set([...orderTypes.value, ...newTypes])];

      if (reset) {
        offset = payload.items.length;
        data.value = { summary: payload.summary, items: payload.items };
      } else {
        offset += payload.items.length;
        if (data.value) data.value.items = [...data.value.items, ...payload.items];
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Произошла ошибка';
    } finally {
      if (reset) loading.value = false;
      else loadingMore.value = false;
    }
  }

  function applyFilters() {
    appliedFilters.value = { ...pendingFilters.value };
    fetchData(appliedFilters.value, true);
  }

  function resetFilters() {
    const defaults = getDefaultFilters();
    pendingFilters.value = defaults;
    appliedFilters.value = { ...defaults };
    cancelReasons.value = [];
    orderTypes.value = [];
    data.value = null;
    fetchData(appliedFilters.value, true);
  }

  function refetch() {
    fetchData(appliedFilters.value, true);
  }

  function loadMore() {
    if (!loadingMore.value && data.value && data.value.items.length < data.value.summary.totalOrders) {
      fetchData(appliedFilters.value, false);
    }
  }

  const hasMore = computed(() =>
    data.value ? data.value.items.length < data.value.summary.totalOrders : false
  );

  // Initial fetch only once on first use
  if (!initialized) {
    initialized = true;
    fetchData(appliedFilters.value, true);
  }

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    pendingFilters,
    cancelReasons,
    orderTypes,
    applyFilters,
    resetFilters,
    refetch,
    loadMore,
  };
}
