<template>
  <div class="player-list">
    <div class="player-list-header">
      <h3 class="list-title">Spelers</h3>
      <span class="player-count">{{ players.length }}/{{ targetCount }}</span>
    </div>

    <TransitionGroup name="player" tag="div" class="players">
      <div
        v-for="player in players"
        :key="player.playerId"
        class="player-item"
        :class="{
          'is-host': player.isHost,
          'is-ready': player.ready,
          'is-me': player.playerId === myPlayerId
        }"
      >
        <div class="player-avatar">
          <span class="avatar-emoji">{{ getAvatarEmoji(player) }}</span>
          <span v-if="player.isHost" class="host-badge">👑</span>
        </div>

        <div class="player-info">
          <span class="player-name">
            {{ player.displayName }}
            <span v-if="player.playerId === myPlayerId" class="me-badge">(jij)</span>
          </span>
          <span class="player-status">
            <template v-if="player.isHost">Host</template>
            <template v-else-if="player.ready">Klaar</template>
            <template v-else>Wacht...</template>
          </span>
        </div>

        <div class="player-ready-indicator">
          <ion-icon
            v-if="player.ready || player.isHost"
            :icon="checkmarkCircle"
            class="ready-icon"
          />
          <ion-icon
            v-else
            :icon="ellipse"
            class="waiting-icon"
          />
        </div>
      </div>

      <!-- Empty slots -->
      <div
        v-for="i in emptySlots"
        :key="'empty-' + i"
        class="player-item empty"
      >
        <div class="player-avatar">
          <span class="avatar-emoji">❓</span>
        </div>
        <div class="player-info">
          <span class="player-name">Wachten op speler...</span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { checkmarkCircle, ellipse } from 'ionicons/icons';
import type { LobbyPlayer } from '@/types';

const props = defineProps<{
  players: LobbyPlayer[];
  targetCount: number;
  myPlayerId?: string | null;
}>();

const emptySlots = computed(() => {
  return Math.max(0, props.targetCount - props.players.length);
});

const avatarEmojis = ['🎮', '🎲', '🃏', '🎯', '🎪', '🎨', '🎭', '🎸'];

function getAvatarEmoji(player: LobbyPlayer): string {
  // Generate consistent emoji based on player ID
  const hash = player.playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarEmojis[hash % avatarEmojis.length];
}
</script>

<style scoped>
.player-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.list-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.player-count {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.players {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.player-item.is-me {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.player-item.is-host {
  background: rgba(255, 193, 7, 0.1);
}

.player-item.is-ready {
  border-color: rgba(76, 175, 80, 0.5);
}

.player-item.empty {
  opacity: 0.5;
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.2);
}

.player-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar-emoji {
  font-size: 24px;
}

.host-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 14px;
}

.player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.player-name {
  font-weight: 600;
  color: white;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.me-badge {
  font-weight: 400;
  color: var(--ion-color-primary);
  font-size: 0.85rem;
}

.player-status {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.player-ready-indicator {
  flex-shrink: 0;
}

.ready-icon {
  font-size: 24px;
  color: var(--ion-color-success);
}

.waiting-icon {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.3);
}

/* Transition animations */
.player-enter-active,
.player-leave-active {
  transition: all 0.3s ease;
}

.player-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.player-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.player-move {
  transition: transform 0.3s ease;
}
</style>
