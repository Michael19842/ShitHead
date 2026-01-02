<template>
  <transition name="slide-fade">
    <div v-if="!connectionStore.isOnline" class="connection-status offline">
      <ion-icon :icon="cloudOffline" />
      <span>Geen verbinding</span>
    </div>
    <div v-else-if="connectionStore.wasRecentlyOffline" class="connection-status reconnected">
      <ion-icon :icon="cloudDone" />
      <span>Verbonden</span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { cloudOffline, cloudDone } from 'ionicons/icons';
import { onMounted, onUnmounted } from 'vue';
import { useConnectionStore } from '@/stores/connectionStore';

const connectionStore = useConnectionStore();

onMounted(() => {
  connectionStore.initialize();
});

onUnmounted(() => {
  connectionStore.cleanup();
});
</script>

<style scoped>
.connection-status {
  position: fixed;
  top: env(safe-area-inset-top, 0);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
}

.connection-status.offline {
  background: rgba(244, 67, 54, 0.95);
  color: white;
}

.connection-status.reconnected {
  background: rgba(76, 175, 80, 0.95);
  color: white;
}

.connection-status ion-icon {
  font-size: 18px;
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
