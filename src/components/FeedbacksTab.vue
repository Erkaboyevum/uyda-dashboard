<template>
  <div class="feedbacks-tab">
    <!-- Filter toggle -->
    <div class="filter-header">
      <button class="collapse-btn" @click="showFilters = !showFilters">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 3H2l8 9.46V19l4 2v-7.54L22 3z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Фильтрлар
        <svg class="chevron" :class="{ open: showFilters }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <Transition name="slide-down">
      <div v-if="showFilters" class="filters-panel">
        <div class="filter-row">
          <label class="filter-label">Client Chat ID</label>
          <input class="filter-input" type="text" v-model="clientChatID" placeholder="ID...">
        </div>
        <div class="filter-row">
          <label class="filter-label">Филиал</label>
          <select class="filter-input" v-model="selectedFilial">
            <option value="">Барчаси</option>
            <option v-for="f in filials" :key="f.code" :value="f.code">{{ f.name }}</option>
          </select>
        </div>
        <div class="filter-row">
          <label class="filter-label">Санадан</label>
          <input class="filter-input" type="date" v-model="dateFrom">
        </div>
        <div class="filter-row">
          <label class="filter-label">Санагача</label>
          <input class="filter-input" type="date" v-model="dateTo">
        </div>
        <div class="filter-row">
          <label class="filter-label">Рейтинг</label>
          <div class="stars-row">
            <button
              v-for="n in 5" :key="n"
              class="star-btn"
              :class="{ active: n <= selectedRating }"
              @click="selectedRating = selectedRating === n ? 0 : n"
            >★</button>
          </div>
        </div>
        <div class="filter-actions">
          <button class="apply-btn" @click="applyFilters">Қўллаш</button>
          <button class="reset-btn" @click="resetFilters">Тозалаш</button>
        </div>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-center">
      <div v-for="i in 5" :key="i" class="fb-skel skeleton" />
    </div>

    <!-- Feedback list -->
    <TransitionGroup v-else name="card-list" tag="div" class="fb-list">
      <div
        v-for="(item, i) in feedbacks"
        :key="item.id ?? i"
        class="fb-card"
        :style="{ transitionDelay: `${Math.min(i, 8) * 40}ms` }"
      >
        <div class="fb-left">
          <div class="fb-avatar">{{ getInitials(item) }}</div>
          <div class="fb-stars">
            <span
              v-for="n in 5" :key="n"
              class="fb-star"
              :class="{ filled: n <= item.rating }"
            >★</span>
          </div>
          <div class="fb-date">{{ formatDate(item.date) }}</div>
        </div>
        <div class="fb-body">
          <div class="fb-meta">
            <strong
              class="fb-name"
              @click="searchByClient(item.client?.chatID)"
            >{{ item.client?.name || '—' }}</strong>
            <span class="fb-receipt">Чек: <strong>{{ item.recipientCode }}</strong></span>
          </div>
          <div v-if="item.filial?.name" class="fb-filial">{{ item.filial.name }}</div>
          <p class="fb-text">{{ item.text }}</p>
        </div>
      </div>
    </TransitionGroup>

    <div v-if="!isLoading && feedbacks.length === 0" class="empty-state">
      <div class="empty-emoji">💬</div>
      <div class="empty-msg">Ҳозирча фикр-мулоҳазалар йўқ</div>
    </div>

    <div style="height: 24px" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const chatID = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

const feedbacks      = ref([]);
const filials        = ref([]);
const selectedFilial = ref('');
const clientChatID   = ref('');
const dateFrom       = ref('');
const dateTo         = ref('');
const selectedRating = ref(0);
const showFilters    = ref(false);
const isLoading      = ref(false);

async function fetchFilials() {
  try {
    const res = await axios.get('https://api.erkaboyev.uz/Golddishes/hs/loyalty/subsection?chatID=' + chatID, {
      headers: {
        Authorization: 'Basic ' + btoa('admin:57325732'),
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });
    filials.value = res.data?.data || [];
  } catch { filials.value = []; }
}

function formatDateForAPI(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

async function fetchFeedbacks() {
  try {
    const params = {
      chatID: chatID,
      filialCode:   selectedFilial.value || '',
      clientChatID: clientChatID.value   || '',
      dateTo:   formatDateForAPI(dateTo.value),
      dateFrom: formatDateForAPI(dateFrom.value),
    };
    if (selectedRating.value > 0) params.rating = selectedRating.value;

    const res = await axios.get('https://api.erkaboyev.uz/Golddishes/hs/loyalty/feedback', {
      params,
      headers: {
        Authorization: 'Basic ' + btoa('admin:57325732'),
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });
    return res.data?.data || [];
  } catch { return []; }
}

async function applyFilters() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  isLoading.value = true;
  feedbacks.value = await fetchFeedbacks();
  isLoading.value = false;
}

async function resetFilters() {
  selectedFilial.value = '';
  clientChatID.value   = '';
  dateFrom.value = '';
  dateTo.value   = '';
  selectedRating.value = 0;
  isLoading.value = true;
  feedbacks.value = await fetchFeedbacks();
  isLoading.value = false;
}

async function searchByClient(id) {
  if (!id) return;
  clientChatID.value = id;
  showFilters.value  = true;
  await applyFilters();
}

function formatDate(s) {
  if (!s) return '';
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/);
  if (m) return `${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}`;
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleString();
}

function getInitials(item) {
  const src = item.client?.name || item.clientName || item.recipientCode || '';
  const p = src.split(/\s+/).filter(Boolean);
  if (!p.length) return 'UK';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

onMounted(async () => {
  isLoading.value = true;
  await fetchFilials();
  feedbacks.value = await fetchFeedbacks();
  isLoading.value = false;
});
</script>

<style scoped>
.feedbacks-tab { padding: 12px 16px; }

/* Filter bar */
.filter-header { margin-bottom: 12px; }
.collapse-btn {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px; font-weight: 600;
  color: var(--text-primary);
  cursor: pointer; font-family: var(--font);
  -webkit-tap-highlight-color: transparent;
}
.collapse-btn:active { transform: scale(0.98); }
.chevron { transition: transform 200ms ease; }
.chevron.open { transform: rotate(180deg); }

.slide-down-enter-active, .slide-down-leave-active { transition: opacity 200ms, transform 200ms; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

.filters-panel {
  background: var(--surface-2);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.filter-row { display: flex; flex-direction: column; gap: 5px; }
.filter-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
.filter-input {
  height: 44px; border-radius: 10px;
  border: 1px solid transparent;
  background: var(--surface-1);
  padding: 0 12px;
  font-size: 15px; color: var(--text-primary);
  font-family: var(--font);
  outline: none;
}
.filter-input:focus { border-color: var(--brand-500); }

.stars-row { display: flex; gap: 6px; }
.star-btn {
  background: none; border: none;
  font-size: 24px; color: rgba(0,0,0,0.12);
  cursor: pointer; padding: 2px; transition: color 150ms;
}
.star-btn.active { color: #F59E0B; }

.filter-actions { display: flex; gap: 10px; }
.apply-btn {
  flex: 1; height: 44px; border-radius: 10px; border: none;
  background: var(--brand-500); color: #fff;
  font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font);
}
.reset-btn {
  flex: 1; height: 44px; border-radius: 10px; border: none;
  background: var(--surface-1); color: var(--text-secondary);
  font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font);
  border: 1px solid var(--border-subtle);
}

/* Skeleton */
.loading-center { display: flex; flex-direction: column; gap: 12px; }
.fb-skel { height: 88px; border-radius: 14px; }

/* Cards */
.fb-list { display: flex; flex-direction: column; gap: 10px; }
.fb-card {
  display: flex; gap: 12px; align-items: flex-start;
  background: var(--surface-2);
  padding: 14px; border-radius: 14px;
  border: 1px solid var(--border-subtle);
  transition: transform 150ms ease;
}
.fb-card:active { transform: scale(0.99); }

.fb-left { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 48px; flex-shrink: 0; }
.fb-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; font-weight: 700; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
}
.fb-stars { display: flex; gap: 1px; }
.fb-star { font-size: 13px; color: rgba(0,0,0,0.12); }
.fb-star.filled { color: #F59E0B; }
.fb-date { font-size: 10px; color: var(--text-secondary); text-align: center; }

.fb-body { flex: 1; min-width: 0; }
.fb-meta { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
.fb-name { font-size: 14px; color: var(--brand-500); cursor: pointer; word-break: break-word; }
.fb-receipt { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.fb-filial {
  display: inline-block; font-size: 11px; color: var(--text-secondary);
  background: var(--surface-1); padding: 3px 8px; border-radius: 6px; margin-bottom: 5px;
}
.fb-text {
  font-size: 14px; color: var(--text-primary); line-height: 1.45; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

/* Empty */
.empty-state { text-align: center; padding: 48px 16px; }
.empty-emoji { font-size: 40px; margin-bottom: 12px; }
.empty-msg { font-size: 15px; color: var(--text-secondary); font-weight: 500; }

/* Card stagger */
.card-list-enter-active { transition: opacity 350ms ease, transform 350ms ease; }
.card-list-enter-from { opacity: 0; transform: translateY(12px); }
</style>
