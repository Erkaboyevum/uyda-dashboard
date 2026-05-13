import { reactive } from 'vue';
import { canAccessCash, canAccessAnalytics, isAdmin } from '@/utils/permissions';

// Singleton reactive state — shared across all components
const state = reactive({
  role: null,
  fullName: null,
  subsection: null,
  language: null,
  chatId: null,
  loaded: false,
});

export function useCurrentUser() {
  function setUser(data) {
    state.role      = data.role      ?? null;
    state.fullName  = data.fullName  ?? null;
    state.subsection = data.subsection ?? null;
    state.language  = data.language  ?? null;
    state.chatId    = data.chatId    ?? null;
    state.loaded    = true;
  }

  function clearUser() {
    state.role = null;
    state.fullName = null;
    state.subsection = null;
    state.language = null;
    state.chatId = null;
    state.loaded = false;
  }

  return {
    state,
    setUser,
    clearUser,
    canAccessCash:      () => canAccessCash(state.role),
    canAccessAnalytics: () => canAccessAnalytics(state.role),
    isAdmin:            () => isAdmin(state.role),
  };
}
