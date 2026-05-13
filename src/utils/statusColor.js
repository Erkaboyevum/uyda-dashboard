// Colors aligned with kollega's design system
export function getStatusBg(status) {
  if (status === 'Успешно') return '#16A34A';
  if (status === 'Отменен') return '#DC2626';
  if (status === 'Открыт')  return '#F59E0B';
  return '#6B7280';
}
