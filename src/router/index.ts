import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue')
  },
  {
    path: '/setup',
    name: 'GameSetup',
    component: () => import('@/views/GameSetupPage.vue')
  },
  {
    path: '/game',
    name: 'Game',
    component: () => import('@/views/GamePage.vue')
  },
  {
    path: '/game-over',
    name: 'GameOver',
    component: () => import('@/views/GameOverPage.vue')
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/views/RulesPage.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsPage.vue')
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: () => import('@/views/AchievementsPage.vue')
  },
  // Online multiplayer routes
  {
    path: '/online',
    name: 'OnlineMenu',
    component: () => import('@/views/online/OnlineMenuPage.vue')
  },
  {
    path: '/online/register',
    name: 'Registration',
    component: () => import('@/views/online/RegistrationPage.vue')
  },
  {
    path: '/online/matchmaking',
    name: 'Matchmaking',
    component: () => import('@/views/online/MatchmakingPage.vue')
  },
  {
    path: '/online/lobby/:lobbyId',
    name: 'Lobby',
    component: () => import('@/views/online/LobbyPage.vue'),
    props: true
  },
  {
    path: '/online/game/:gameId',
    name: 'OnlineGame',
    component: () => import('@/views/online/OnlineGamePage.vue'),
    props: true
  },
  {
    path: '/online/game-over/:gameId',
    name: 'OnlineGameOver',
    component: () => import('@/views/online/OnlineGameOverPage.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
