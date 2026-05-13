/**
 * API returns checked as a number (1/0), boolean, or string.
 * This helper normalises all representations.
 */
export function isUserChecked(user) {
  if (!user) return false;
  const v = user.checked;
  return v === 1 || v === true || v === '1' || v === 'true';
}
