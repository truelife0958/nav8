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

// Route guard - Admin component handles its own auth state
// This guard provides early token validation for better UX
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token');
    // 如果没有token，仍然允许访问admin页面
    // Admin组件会显示登录表单
    // 如果token存在但可能过期，Admin组件会处理
    if (!token) {
      // 无token时直接进入admin显示登录表单
      next();
    } else {
      // 有token时进入admin，由组件验证token有效性
      next();
    }
  } else {
    next();
  }
});

export default router; 