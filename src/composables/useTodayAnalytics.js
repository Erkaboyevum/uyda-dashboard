import { ref, onMounted } from 'vue';
import { ANALYTICS_API_URL, ANALYTICS_AUTH_HEADER } from '@/config/analyticsApi';

export function useTodayAnalytics() {
  const data = ref(null);
  const loading = ref(true);
  const error = ref(null);

  async function fetch() {
    loading.value = true;
    error.value = null;
    const today = new Date().toISOString().split('T')[0];
    const p = new URLSearchParams({ dateFrom: today, dateTo: today, limit: '1', offset: '0' });
    try {
      const res = await window.fetch(`${ANALYTICS_API_URL}?${p}`, {
        headers: { Authorization: ANALYTICS_AUTH_HEADER },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.errorMessage || `HTTP ${res.status}`);
      const payload = json.data ?? json;
      if (!payload?.summary) throw new Error('Нет данных');
      data.value = payload.summary;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetch);

  return { data, loading, error };
}
