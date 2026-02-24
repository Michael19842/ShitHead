<template>
  <ion-app>
    <SplashScreen v-if="showSplash" @complete="onSplashComplete" />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { ref, onMounted } from 'vue';
import SplashScreen from '@/components/SplashScreen.vue';

const showSplash = ref(false);

onMounted(() => {
  // Check if this is the first visit this session
  const hasSeenSplash = sessionStorage.getItem('shithead_splash_seen');
  if (!hasSeenSplash) {
    showSplash.value = true;
  }
});

function onSplashComplete() {
  showSplash.value = false;
  sessionStorage.setItem('shithead_splash_seen', 'true');
}
</script>
