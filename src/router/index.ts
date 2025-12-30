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
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
