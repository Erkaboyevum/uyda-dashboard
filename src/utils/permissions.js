// Role arrays depend on 1C Перечисления.ТелеграмПользовательДолжность
// Update these arrays once you confirm the exact values from 1C.
const CASH_ROLES      = ['OS_manager', 'director', 'Кассир', 'Admin', 'Администратор', 'Руководитель'];
const ANALYTICS_ROLES = ['OS_manager', 'director', 'Менеджер', 'Manager', 'Admin', 'Администратор', 'Руководитель'];
const ADMIN_ROLES     = ['Admin', 'Администратор', 'Руководитель'];

export function canAccessCash(role) {
  return CASH_ROLES.includes(role);
}

export function canAccessAnalytics(role) {
  return ANALYTICS_ROLES.includes(role);
}

export function isAdmin(role) {
  return ADMIN_ROLES.includes(role);
}
