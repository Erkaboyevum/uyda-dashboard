import { reactive } from 'vue';
import { canAccessCash, canAccessAnalytics, isAdmin } from '@/utils/permissions';

const state = reactive({
  role:                null,
  fullName:            null,
  subsection:          null,
  organization:        null,
  cashRegister:        null,
  cashRegisterBalance: null,
  language:            null,
  chatId:              null,
  loaded:              false,
});

export function useCurrentUser() {
  function setUser(data) {
    state.role                = data.role                ?? null;
    state.fullName            = data.fullName            ?? null;
    state.subsection          = data.subsection          ?? null;
    state.organization        = data.organization        ?? null;
    state.cashRegister        = data.cashRegister        ?? null;
    state.cashRegisterBalance = data.cashRegisterBalance ?? null;
    state.language            = data.language            ?? null;
    state.chatId              = data.chatId              ?? null;
    state.loaded              = true;
  }

  function clearUser() {
    Object.keys(state).forEach(k => { state[k] = null; });
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
