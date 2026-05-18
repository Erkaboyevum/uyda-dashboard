import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('@/views/WelcomeView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
  },
  {
    path: '/sent',
    name: 'Sent',
    component: () => import('@/views/Sent.vue'),
  },
  {
    path: '/app',
    component: MainLayout,
    children: [
      { path: '', redirect: 'moliya' },
      {
        path: 'moliya',
        name: 'Moliya',
        component: () => import('@/views/DocumentsView.vue'),
      },
      {
        path: 'savdo',
        name: 'Savdo',
        component: () => import('@/views/SavdoView.vue'),
      },
    ],
  },
  {
    path: '/profileEdit',
    name: 'ProfileEdit',
    component: () => import('@/views/ProfileEdit.vue'),
  },
  // Legacy redirects
  { path: '/documents',  redirect: '/app/moliya' },
  { path: '/analytics',  redirect: '/app/savdo' },
  { path: '/feedbacks',  redirect: '/app/savdo' },
  { path: '/profile',    redirect: '/app/moliya' },
  { path: '/profileedit', redirect: '/profileEdit' },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
