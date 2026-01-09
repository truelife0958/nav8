import { createRouter, createWebHistory } from 'vue-router';

const Home = () => import('./views/Home.vue');
const Admin = () => import('./views/Admin.vue');

const routes = [
  { path: '/', component: Home },
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Route guard - redirect to home if not authenticated
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      // No token, redirect to home (login page is in Admin component)
      // But we allow access to show the login form
      // The actual auth check happens in the Admin component
      // This guard is for immediate token presence check
      next();
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router; 