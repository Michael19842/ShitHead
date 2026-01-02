<template>
  <div class="turn-timer" :class="{ warning: isWarning, critical: isCritical }">
    <div class="timer-content">
      <span class="timer-label">{{ label }}</span>
      <span class="timer-value">{{ displayTime }}</span>
    </div>
    <div class="timer-bar">
      <div class="timer-progress" :style="{ width: progressPercent + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  expiresAt: Date | number | null;
  label?: string;
  warning?: boolean;
  totalTime?: number;
}>();

const now = ref(Date.now());
let intervalId: ReturnType<typeof setInterval> | null = null;

const expiresAtMs = computed(() => {
  if (!props.expiresAt) return 0;
  if (props.expiresAt instanceof Date) {
    return props.expiresAt.getTime();
  }
  return props.expiresAt;
});

const remainingMs = computed(() => {
  if (!expiresAtMs.value) return 0;
  return Math.max(0, expiresAtMs.value - now.value);
});

const remainingSeconds = computed(() => {
  return Math.ceil(remainingMs.value / 1000);
});

const displayTime = computed(() => {
  const secs = remainingSeconds.value;
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;

  if (mins > 0) {
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  }
  return `${remainingSecs}s`;
});

const totalTimeMs = computed(() => {
  return (props.totalTime || 20) * 1000;
});

const progressPercent = computed(() => {
  if (!expiresAtMs.value) return 0;
  return Math.min(100, (remainingMs.value / totalTimeMs.value) * 100);
});

const isWarning = computed(() => {
  return props.warning && remainingSeconds.value <= 10 && remainingSeconds.value > 5;
});

const isCritical = computed(() => {
  return props.warning && remainingSeconds.value <= 5;
});

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = Date.now();
  }, 100);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

watch(() => props.expiresAt, () => {
  now.value = Date.now();
});
</script>

<style scoped>
.turn-timer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  min-width: 120px;
}

.timer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timer-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  font-weight: 600;
}

.timer-value {
  font-size: 18px;
  font-weight: bold;
  color: white;
  font-variant-numeric: tabular-nums;
}

.timer-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.timer-progress {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 2px;
  transition: width 0.1s linear;
}

/* Warning state (10-5 seconds) */
.turn-timer.warning .timer-value {
  color: #FFB300;
}

.turn-timer.warning .timer-progress {
  background: linear-gradient(90deg, #FF9800, #FFB300);
}

/* Critical state (< 5 seconds) */
.turn-timer.critical {
  animation: pulse-bg 0.5s ease-in-out infinite;
}

.turn-timer.critical .timer-value {
  color: #FF5252;
  animation: pulse-text 0.5s ease-in-out infinite;
}

.turn-timer.critical .timer-progress {
  background: linear-gradient(90deg, #F44336, #FF5252);
}

@keyframes pulse-bg {
  0%, 100% {
    background: rgba(244, 67, 54, 0.3);
  }
  50% {
    background: rgba(244, 67, 54, 0.5);
  }
}

@keyframes pulse-text {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
