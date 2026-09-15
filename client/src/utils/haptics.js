// Vibration is unsupported on iOS Safari and blocked everywhere until the
// user has interacted with the page, so this is always best-effort — never
// the only feedback for anything.
export const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern)
}

export const REST_TIMER_DONE = [200, 100, 200]
export const ACHIEVEMENT     = [60, 50, 60, 50, 160]
