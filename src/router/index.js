import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { 
    path: '/', 
    name: 'Welcome', 
    component: () => import('@/views/WelcomeView.vue') 
  },
  { 
    path: '/register', 
    name: 'Register', 
    component: () => import('@/views/RegisterView.vue') 
  },
  { 
    path: '/sent', 
    name: 'Sent', 
    component: () => import('@/views/Sent.vue') 
  },
  { 
    path: '/documents', 
    name: 'Documents', 
    component: () => import('@/views/DocumentsView.vue') 
  },
  { 
    path: '/addDocument', 
    name: 'DocumentCreate', 
    component: () => import('@/views/DocumentCreate.vue'),
  },
  { 
    path: '/profile', 
    name: 'ProfileView', 
    component: () => import('@/views/ProfileView.vue') 
  },
  { 
    path: '/profileEdit', 
    name: 'ProfileEdit', 
    component: () => import('@/views/ProfileEdit.vue') 
  },
  {
    path: '/feedbacks',
    name: 'Feedbacks',
    component: () => import('@/views/feedbacksView.vue')
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: () => import('@/views/AnalyticsView.vue'),
  }
]


const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  }
});

// Global navigation guard
router.beforeEach((to, from, next) => {
  console.log(`Navigation from: ${from} to: ${to.name}`);
  next();
});

export default router;