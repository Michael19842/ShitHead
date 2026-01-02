<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="register-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" text="" />
        </ion-buttons>
        <ion-title>Registreren</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="register-content">
      <div class="register-container">
        <!-- Logo -->
        <div class="logo-section">
          <div class="logo-emoji">🌐</div>
          <h2 class="section-title">Online Spelen</h2>
          <p class="section-subtitle">Kies een unieke naam om online te spelen</p>
        </div>

        <!-- Registration form -->
        <div class="form-section">
          <div class="input-group">
            <ion-input
              v-model="displayName"
              type="text"
              placeholder="Jouw naam"
              :maxlength="20"
              :counter="true"
              :class="{ 'has-error': nameError }"
              @ionInput="validateName"
              @keyup.enter="handleRegister"
            />
            <transition name="fade">
              <p v-if="nameError" class="error-message">{{ nameError }}</p>
            </transition>
            <transition name="fade">
              <p v-if="nameAvailable && !nameError && displayName.length >= 2" class="success-message">
                <ion-icon :icon="checkmarkCircle" /> Naam is beschikbaar
              </p>
            </transition>
          </div>

          <ion-button
            expand="block"
            size="large"
            :disabled="!canRegister"
            @click="handleRegister"
            class="register-button"
          >
            <ion-spinner v-if="isLoading" name="crescent" />
            <template v-else>
              <ion-icon slot="start" :icon="personAdd" />
              Registreren
            </template>
          </ion-button>
        </div>

        <!-- Info section -->
        <div class="info-section">
          <div class="info-card">
            <ion-icon :icon="informationCircle" class="info-icon" />
            <div class="info-text">
              <p>Je naam wordt opgeslagen op dit apparaat.</p>
              <p>Je kunt later online spelen tegen andere spelers!</p>
            </div>
          </div>
        </div>

        <!-- Error alert -->
        <transition name="fade">
          <div v-if="authStore.error" class="error-alert">
            <ion-icon :icon="alertCircle" />
            {{ authStore.error }}
          </div>
        </transition>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonInput, IonIcon, IonSpinner
} from '@ionic/vue';
import { personAdd, checkmarkCircle, informationCircle, alertCircle } from 'ionicons/icons';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { validateDisplayName, isNameTaken } from '@/services/firebase/playerService';

const router = useRouter();
const authStore = useAuthStore();

const displayName = ref('');
const nameError = ref<string | null>(null);
const nameAvailable = ref(false);
const isCheckingName = ref(false);
const isLoading = ref(false);

let checkNameTimeout: ReturnType<typeof setTimeout> | null = null;

const canRegister = computed(() => {
  return displayName.value.trim().length >= 2 &&
    !nameError.value &&
    nameAvailable.value &&
    !isLoading.value &&
    !isCheckingName.value;
});

onMounted(async () => {
  // Initialize auth store
  await authStore.initialize();

  // If already registered, redirect to online menu
  if (authStore.isRegistered) {
    router.replace('/online');
  }
});

async function validateName() {
  const name = displayName.value.trim();
  nameAvailable.value = false;

  // Clear previous timeout
  if (checkNameTimeout) {
    clearTimeout(checkNameTimeout);
  }

  // Basic validation first
  const validation = validateDisplayName(name);
  if (!validation.valid) {
    nameError.value = validation.error || 'Ongeldige naam';
    return;
  }

  nameError.value = null;

  // Debounce the server check
  if (name.length >= 2) {
    isCheckingName.value = true;
    checkNameTimeout = setTimeout(async () => {
      try {
        const taken = await isNameTaken(name);
        if (taken) {
          nameError.value = 'Deze naam is al in gebruik';
          nameAvailable.value = false;
        } else {
          nameAvailable.value = true;
        }
      } catch (err) {
        console.error('Error checking name:', err);
        nameError.value = 'Kon naam niet controleren';
      } finally {
        isCheckingName.value = false;
      }
    }, 500);
  }
}

async function handleRegister() {
  if (!canRegister.value) return;

  isLoading.value = true;
  authStore.clearError();

  try {
    const success = await authStore.register(displayName.value.trim());

    if (success) {
      router.replace('/online');
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.register-toolbar {
  --background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  --color: white;
}

.register-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.register-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 2rem;
  gap: 2rem;
}

/* Logo section */
.logo-section {
  text-align: center;
  padding-top: 1rem;
}

.logo-emoji {
  font-size: 64px;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.section-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem 0;
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 1rem;
}

/* Form section */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

ion-input {
  --background: rgba(255, 255, 255, 0.1);
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.5);
  --padding-start: 16px;
  --padding-end: 16px;
  --border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 1.1rem;
  min-height: 56px;
  transition: border-color 0.2s;
}

ion-input:focus-within {
  border-color: var(--ion-color-primary);
}

ion-input.has-error {
  border-color: var(--ion-color-danger);
}

.error-message {
  color: var(--ion-color-danger);
  font-size: 0.9rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.success-message {
  color: var(--ion-color-success);
  font-size: 0.9rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.register-button {
  --background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  --border-radius: 12px;
  --box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  font-weight: bold;
  font-size: 1.1rem;
  height: 56px;
  margin-top: 0.5rem;
}

.register-button[disabled] {
  --background: rgba(255, 255, 255, 0.2);
  --box-shadow: none;
  opacity: 0.6;
}

/* Info section */
.info-section {
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

.info-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-icon {
  font-size: 24px;
  color: var(--ion-color-primary);
  flex-shrink: 0;
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-text p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

/* Error alert */
.error-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 12px;
  color: #ff8a80;
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
