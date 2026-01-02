import { ref, computed, watch, onUnmounted } from 'vue';

export interface UseTimerOptions {
  onExpire?: () => void;
  warningThreshold?: number; // seconds before expiry to trigger warning
}

export function useTimer(options: UseTimerOptions = {}) {
  const { onExpire, warningThreshold = 5 } = options;

  const expiresAt = ref<Date | null>(null);
  const now = ref(Date.now());
  const hasExpired = ref(false);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const remainingMs = computed(() => {
    if (!expiresAt.value) return 0;
    return Math.max(0, expiresAt.value.getTime() - now.value);
  });

  const remainingSeconds = computed(() => {
    return Math.ceil(remainingMs.value / 1000);
  });

  const isWarning = computed(() => {
    return remainingSeconds.value > 0 && remainingSeconds.value <= warningThreshold;
  });

  const isExpired = computed(() => {
    return expiresAt.value !== null && remainingMs.value <= 0;
  });

  function setExpiry(date: Date | null) {
    expiresAt.value = date;
    hasExpired.value = false;
    now.value = Date.now();
  }

  function start() {
    stop();
    intervalId = setInterval(() => {
      now.value = Date.now();

      // Check for expiry
      if (isExpired.value && !hasExpired.value) {
        hasExpired.value = true;
        onExpire?.();
      }
    }, 100);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // Auto-start when expiry is set
  watch(expiresAt, (newVal) => {
    if (newVal) {
      start();
    } else {
      stop();
    }
  }, { immediate: true });

  onUnmounted(() => {
    stop();
  });

  return {
    expiresAt,
    remainingMs,
    remainingSeconds,
    isWarning,
    isExpired,
    setExpiry,
    start,
    stop
  };
}
