import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';

export const useConnectionStore = defineStore('connection', () => {
  const isOnline = ref(navigator.onLine);
  const lastOnlineAt = ref<Date | null>(null);
  const reconnectAttempts = ref(0);

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Listen for online/offline events
  function handleOnline() {
    isOnline.value = true;
    lastOnlineAt.value = new Date();
    reconnectAttempts.value = 0;
  }

  function handleOffline() {
    isOnline.value = false;
  }

  function initialize() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check periodically
    heartbeatInterval = setInterval(() => {
      isOnline.value = navigator.onLine;
    }, 5000);
  }

  function cleanup() {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  const wasRecentlyOffline = computed(() => {
    if (!lastOnlineAt.value) return false;
    return Date.now() - lastOnlineAt.value.getTime() < 5000;
  });

  return {
    isOnline,
    lastOnlineAt,
    reconnectAttempts,
    wasRecentlyOffline,
    initialize,
    cleanup
  };
});
