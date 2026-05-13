<template>
  <nav class="bottom-bar">
    <router-link
      v-if="canAccessCash()"
      to="/documents"
      class="bar-item"
      :class="{ active: isActive('/documents') || isActive('/addDocument') }"
    >
      <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
        <path d="M3 7h18M3 12h18M3 17h18" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ t('tabs.documents') }}</span>
    </router-link>

    <router-link
      to="/feedbacks"
      class="bar-item"
      :class="{ active: isActive('/feedbacks') }"
    >
      <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ t('tabs.feedbacks') }}</span>
    </router-link>

    <router-link
      v-if="canAccessAnalytics()"
      to="/analytics"
      class="bar-item"
      :class="{ active: isActive('/analytics') }"
    >
      <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ t('tabs.analytics') }}</span>
    </router-link>

    <router-link
      to="/profile"
      class="bar-item"
      :class="{ active: isActive('/profile') || isActive('/profileEdit') }"
    >
      <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="7" r="4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ t('tabs.profile') }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCurrentUser } from '@/composables/useCurrentUser';

const route = useRoute();
const { t } = useI18n();
const { canAccessCash, canAccessAnalytics } = useCurrentUser();

const isActive = (path) => route.path === path;
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  left: 8px;
  right: 8px;
  bottom: 10px;
  min-height: 56px;
  background: linear-gradient(90deg, #ffffff, #f8fafc);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(16,24,40,0.08);
  display: flex;
  gap: 4px;
  padding: 6px;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 10px;
  border-radius: 10px;
  color: #374151;
  text-decoration: none;
  font-weight: 600;
  font-size: 11px;
  background: transparent;
  transition: all .16s ease;
  white-space: nowrap;
  flex: 1;
  max-width: 90px;
}
.bar-item .icon { color: #6b7280; }
.bar-item.active {
  background: linear-gradient(90deg, #667eea, #764ba2);
  color: #fff;
}
.bar-item.active .icon { color: #fff; }
</style>
