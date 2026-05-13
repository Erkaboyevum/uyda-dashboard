<template>
	<div class="feedbacks-page container">
		<h1 class="title">Fikr-mulohazalar</h1>
        <hr>

		<div class="filter-header ">
			<button class="collapse-btn" @click="showFilters = !showFilters">
				<span class="icon">{{ showFilters ? '▼' : '▶' }}</span>
				Filtirlar
			</button>
		</div>

		<div v-show="showFilters" class="filters">
			<div class="filter-group">
				<label for="client-chat-id">Client Chat ID:</label>
				<input id="client-chat-id" type="text" v-model="clientChatID" placeholder="Kiritish...">
			</div>

			<div class="filter-group">
				<label for="filial-select">Filial:</label>
				<select id="filial-select" v-model="selectedFilial">
					<option value="">Barchasi</option>
					<option v-for="filial in uniqueFilials" :key="filial.code" :value="filial.code">
						{{ filial.name }}
					</option>
				</select>
			</div>

			<div class="filter-group">
				<label for="date-from">Sanasi (dan):</label>
				<input id="date-from" type="date" v-model="dateFrom">
			</div>

			<div class="filter-group">
				<label for="date-to">Sanasi (gacha):</label>
				<input id="date-to" type="date" v-model="dateTo">
			</div>

			<div class="filter-group">
				<label>Rating:</label>
				<div class="stars-filter">
					<button 
						v-for="n in 5" 
						:key="n"
						class="star-btn"
						:class="{ active: n <= selectedRating }"
						@click="selectedRating === n ? selectedRating = 0 : selectedRating = n"
					>
						&#9733;
					</button>
				</div>
			</div>

			<button class="apply-btn" @click="applyFilters">
				Qoʻllash
			</button>

			<button class="reset-btn" @click="resetFilters">
				Tozalash
			</button>
		</div>

		<div v-if="isLoading" class="loader-container">
			<div class="loader"></div>
			<p>Yuklanmoqda...</p>
		</div>

		<div v-else class="feedback-list">
            <h4></h4>
			<div v-for="item in feedbacks" :key="item.id" class="feedback-card">
				<div class="left">
					<div class="avatar" :title="item.client?.name || item.clientName">{{ getInitials(item) }}</div>
					<div class="rating">
						<template v-for="n in 5" :key="n">
							<i :class="['star', n <= item.rating ? 'filled' : '']">&#9733;</i>
						</template>
						<div class="date">{{ formatDate(item.date) }}</div>
					</div>
				</div>

				<div class="content">
					<div class="header">
						<div class="client"><strong class="client-chat-link" @click="searchByClientChatID(item.client.chatID)">{{ item.client.name }}</strong></div>
						<div class="recipient">Chek raqami:  <strong>{{ item.recipientCode }}</strong></div>
						<div class="filial">{{ item.filial?.name || '' }}</div>
					</div>
					<p class="text">{{ item.text }}</p>
				</div>
			</div>
			<div v-if="feedbacks.length === 0" class="empty">Hozircha fikr-mulohaza yo'q.</div>
		</div>
		<div class="__space"></div>
		<BottomBar />
	</div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import BottomBar from '@/components/BottomBar.vue';
import axios from 'axios';

const feedbacks = ref([]);
const allFeedbacks = ref([]);
const selectedFilial = ref('');
const clientChatID = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const selectedRating = ref(0);
const showFilters = ref(false);
const isLoading = ref(false);
const filials = ref([]);
const chatID = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

const uniqueFilials = computed(() => {
	return filials.value;
});

const fetchFilials = async () => {
	try {
		const response = await axios.get('https://api.erkaboyev.uz/Golddishes/hs/loyalty/subsection?chatID='+chatID, {
			headers: {
				Authorization: 'Basic ' + btoa('admin:57325732'),
				'Content-Type': 'application/json',
				'ngrok-skip-browser-warning': 'true'
			}
		});
		filials.value = response.data?.data || [];
		console.log('Fetched filials:', filials.value);
	} catch (err) {
		console.error('fetchFilials error', err);
		filials.value = [];
	}
};

const fetchAllFeedbacks = async (chatID) => {
	try {
		// Convert dates from yyyy-mm-dd to dd.mm.yyyy format
		const formatDateForAPI = (date) => {
			if (!date) return '';
			const [year, month, day] = date.split('-');
			return `${day}.${month}.${year}`;
		};

		const params = {
			chatID: chatID,
			filialCode: selectedFilial.value || '',
			clientChatID: clientChatID.value || '',
			dateTo: formatDateForAPI(dateTo.value),
			dateFrom: formatDateForAPI(dateFrom.value),
		};
		
		if (selectedRating.value > 0) {
			params.rating = selectedRating.value;
		}

		const response = await axios.get('https://api.erkaboyev.uz/Golddishes/hs/loyalty/feedback', {
			params: params,
			headers: {
				Authorization: 'Basic ' + btoa('admin:57325732'),
				'Content-Type': 'application/json',
				'ngrok-skip-browser-warning': 'true'
			}
		});
		return response.data?.data || [];
	} catch (err) {
		console.error('fetchAllFeedbacks error', err);
		return [];
	}
};

const applyFilters = async () => {
	isLoading.value = true;
	feedbacks.value = [];
	
	feedbacks.value = await fetchAllFeedbacks(chatID);
	isLoading.value = false;
};

const resetFilters = async () => {
	isLoading.value = true;
	selectedFilial.value = '';
	clientChatID.value = '';
	dateFrom.value = '';
	dateTo.value = '';
	selectedRating.value = 0;
	feedbacks.value = await fetchAllFeedbacks(chatID);
	isLoading.value = false;
};

const searchByClientChatID = async (chatId) => {
	isLoading.value = true;
	clientChatID.value = chatId;
	showFilters.value = true;
	feedbacks.value = [];
	feedbacks.value = await fetchAllFeedbacks(chatID);
	isLoading.value = false;
};

function convertToDate(dateString) {
	// Handle 'dd.mm.yyyy hh:mm' format
	const match = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/);
	if (match) {
		const [, day, month, year, hours, minutes] = match;
		return new Date(`${year}-${month}-${day}T${hours}:${minutes}`);
	}
	return new Date(dateString);
}

onMounted(async () => {
	// const chatID = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '1319223069';
	isLoading.value = true;
	await fetchFilials();
	feedbacks.value = await fetchAllFeedbacks(chatID);
	isLoading.value = false;
	console.log('Fetched feedbacks:', feedbacks.value);
});

function formatDate(dateString) {
	try {
		// Handle 'dd.mm.yyyy hh:mm' format
		const match = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/);
		if (match) {
			const [, day, month, year, hours, minutes] = match;
			return `${day}.${month}.${year} ${hours}:${minutes}`;
		}
		// Fallback for other formats
		const d = new Date(dateString);
		if (!isNaN(d.getTime())) {
			return d.toLocaleString();
		}
		return dateString;
	} catch (e) {
		return dateString;
	}
}

function getInitials(item) {
	let source = item.client?.name || item.clientName || '';
	if (!source) {
		source = item.recipientCode || '';
	}
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'UK';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

</script>

<script>
export default {
	components: { BottomBar }
}
</script>

<style scoped>
:root {
	--bg: #f7f8fb;
	--card: #ffffff;
	--muted: #6b7280;
	--accent: linear-gradient(135deg,#ffd89b 0%,#19547b 100%);
}
.feedbacks-page { padding: 20px; background: var(--bg); min-height: 100vh; }
.title { font-size: 22px; margin-bottom: 16px; color: #111827; }
.filter-header {
	margin-bottom: 12px;
}
.collapse-btn {
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--card);
	border: 1px solid #d1d5db;
	border-radius: 8px;
	padding: 10px 14px;
	font-size: 14px;
	font-weight: 600;
	color: #374151;
	cursor: pointer;
	transition: all 0.2s ease;
}
.collapse-btn:hover {
	background: #f9fafb;
	border-color: #9ca3af;
}
.collapse-btn:active {
	transform: scale(0.98);
}
.collapse-btn .icon {
	font-size: 12px;
	transition: transform 0.2s ease;
}
.__space {
	flex: 1;
	min-height: 60px;
}
.filters {
	display: flex;
	gap: 12px;
	margin-bottom: 20px;
	flex-wrap: wrap;
	background: var(--card);
	padding: 14px;
	border-radius: 12px;
	box-shadow: 0 2px 8px rgba(16,24,40,0.06);
	animation: slideDown 0.3s ease;
}
@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
.filter-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.filter-group label {
	font-size: 12px;
	font-weight: 600;
	color: #374151;
}
.filter-group select,
.filter-group input {
	padding: 8px 12px;
	border: 1px solid #d1d5db;
	border-radius: 8px;
	font-size: 13px;
	background: white;
	cursor: pointer;
	min-width: 140px;
}
.filter-group select:hover,
.filter-group input:hover {
	border-color: #9ca3af;
}
.filter-group select:focus,
.filter-group input:focus {
	outline: none;
	border-color: #667eea;
	box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.apply-btn {
	align-self: flex-end;
	padding: 8px 16px;
	background: #10b981;
	color: white;
	border: none;
	border-radius: 8px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;
}
.apply-btn:hover {
	background: #059669;
	box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.apply-btn:active {
	transform: scale(0.98);
}
.reset-btn {
	align-self: flex-end;
	padding: 8px 16px;
	background: #ef4444;
	color: white;
	border: none;
	border-radius: 8px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;
}
.reset-btn:hover {
	background: #dc2626;
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.reset-btn:active {
	transform: scale(0.98);
}
.stars-filter {
	display: flex;
	align-items: center;
	gap: 8px;
}
.star-btn {
	background: none;
	border: none;
	font-size: 24px;
	color: #e6e6e6;
	cursor: pointer;
	padding: 4px;
	transition: all 0.2s ease;
}
.star-btn:hover {
	color: #f5a623;
	transform: scale(1.1);
}
.star-btn.active {
	color: #f5a623;
	text-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.rating-text {
	font-size: 12px;
	color: #6b7280;
	font-weight: 600;
}
.loader-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60px 20px;
	gap: 20px;
}
.loader {
	border: 4px solid #f3f4f6;
	border-top: 4px solid #667eea;
	border-radius: 50%;
	width: 50px;
	height: 50px;
	animation: spin 1s linear infinite;
}
@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}
.loader-container p {
	color: #6b7280;
	font-size: 14px;
	font-weight: 600;
}
.feedback-list { display: flex; flex-direction: column; gap: 14px; }
.feedback-card {
	display: flex; gap: 14px; align-items: flex-start; background: var(--card);
	padding: 14px; border-radius: 12px; box-shadow: 0 6px 18px rgba(16,24,40,0.06);
	transition: transform .18s ease, box-shadow .18s ease;
}
.feedback-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(16,24,40,0.08); }
.left { display:flex; gap:12px; align-items:flex-start; width:120px; }
.avatar {
	width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center;
	background: linear-gradient(135deg,#667eea,#764ba2); color:#fff; font-weight:700; font-size:14px;
}
.rating { display:flex; flex-direction:column; align-items:flex-start; }
.stars { display:flex; gap:4px; }
.star { font-size:16px; color:#e6e6e6; }
.star.filled { color:#f5a623; text-shadow: 0 1px 0 rgba(0,0,0,0.04); }
.date { font-size:12px; color:var(--muted); margin-top:8px; }
.content { flex:1; }
.header { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:8px; }
.recipient { font-size:13px; color:#111827; }
.client-chat-link {
	cursor: pointer;
	color: #667eea;
	transition: all 0.2s ease;
}
.client-chat-link:hover {
	color: #764ba2;
	text-decoration: underline;
}
.filial { font-size:12px; color:var(--muted); background:#f3f4f6; padding:6px 8px; border-radius:8px; }
.text { margin:0; color:#374151; line-height:1.45; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.empty { text-align:center; color:var(--muted); padding:24px; }

@media (max-width: 640px) {
	.filters {
		flex-direction: column;
		gap: 10px;
	}
	.filter-group {
		flex-direction: row;
		align-items: center;
		gap: 8px;
	}
	.filter-group label {
		min-width: 80px;
	}
	.filter-group select,
	.filter-group input {
		min-width: 0;
		flex: 1;
	}
	.apply-btn,
	.reset-btn {
		align-self: flex-start;
		width: 100%;
	}
	.feedback-list { gap: 12px; }
	.feedback-card { flex-direction: column; gap: 10px; padding:12px; }
	.left { width:100%; display:flex; align-items:center; gap:12px; }
	.avatar { width:42px; height:42px; border-radius:50%; font-size:13px; }
	.rating { flex-direction:row; align-items:center; gap:8px; }
	.stars { order: 0; }
	.date { font-size:11px; color:var(--muted); margin-top:0; }
	.header { flex-direction:column; align-items:flex-start; gap:6px; }
	.filial { padding:4px 6px; font-size:11px; }
	.text { font-size:14px; -webkit-line-clamp:4; }
}

@media (max-width: 420px) {
	.feedback-card { padding:10px; }
	.avatar { width:38px; height:38px; }
	.recipient { font-size:13px; }
	.date { font-size:10px; }
}
</style>

