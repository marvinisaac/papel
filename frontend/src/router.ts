import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import App from './App.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: App,
  },
  {
    path: '/note/:id',
    name: 'note',
    component: App,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
