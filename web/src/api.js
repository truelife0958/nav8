import axios from 'axios';

const BASE = '/api';

// 创建axios实例
const api = axios.create({
  baseURL: BASE,
  timeout: 15000
});

// 提取错误消息
const getErrorMessage = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.status === 404) {
    return '请求的资源不存在';
  }
  if (error.response?.status === 500) {
    return '服务器内部错误';
  }
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请检查网络';
  }
  if (!error.response) {
    return '网络连接失败，请检查网络';
  }
  return error.message || '操作失败';
};

// 请求拦截器 - 自动添加token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response,
  error => {
    // 处理401未授权
    if (error.response?.status === 401) {
      // 避免无限循环刷新，只有在非登录页面且确实有 token 时才处理
      // 或者交给组件处理重定向
      const token = localStorage.getItem('token');
      if (token) {
         localStorage.removeItem('token');
         // 可以选择触发一个事件或者让前端路由守卫处理
         // window.location.reload(); // 简单粗暴的处理
      }
    }
    // 添加友好错误消息
    error.friendlyMessage = getErrorMessage(error);
    return Promise.reject(error);
  }
);

// 导出错误消息提取函数供组件使用
export { getErrorMessage };

// --- API 方法定义 ---
// 由于拦截器已处理 Token，无需手动传递 headers

export const login = (username, password) => api.post('/login', { username, password });

// 菜单相关API
export const getMenus = () => api.get('/menus');
export const addMenu = (data) => api.post('/menus', data);
export const updateMenu = (id, data) => api.put(`/menus/${id}`, data);
export const deleteMenu = (id) => api.delete(`/menus/${id}`);

// 子菜单相关API
export const getSubMenus = (menuId) => api.get(`/menus/${menuId}/submenus`);
export const addSubMenu = (menuId, data) => api.post(`/menus/${menuId}/submenus`, data);
export const updateSubMenu = (id, data) => api.put(`/menus/submenus/${id}`, data);
export const deleteSubMenu = (id) => api.delete(`/menus/submenus/${id}`);

// 菜单批量排序API
export const batchReorderMenus = (orders) => api.post('/menus/batch/reorder', { orders });
export const batchReorderSubMenus = (orders) => api.post('/menus/submenus/batch/reorder', { orders });

// 卡片相关API
export const getCards = (menuId, subMenuId = null) => {
  const params = subMenuId ? { subMenuId } : {};
  return api.get(`/cards/${menuId}`, { params });
};

// 搜索卡片
export const searchCards = (q) => api.get('/cards/search/query', { params: { q } });

export const addCard = (data) => api.post('/cards', data);
export const updateCard = (id, data) => api.put(`/cards/${id}`, data);
export const deleteCard = (id) => api.delete(`/cards/${id}`);
export const batchDeleteCards = (ids) => api.post('/cards/batch/delete', { ids });
export const batchMoveCards = (ids, menu_id, sub_menu_id) => api.post('/cards/batch/move', { ids, menu_id, sub_menu_id });
export const checkDeadLinks = (ids) => api.post('/cards/batch/check-links', { ids });
export const batchReorderCards = (orders) => api.post('/cards/batch/reorder', { orders });

export const uploadLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api.post('/upload', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
    // Authorization headers are handled by interceptor
  });
};

// 广告API
export const getAds = () => api.get('/banners');
export const addAd = (data) => api.post('/banners', data);
export const updateAd = (id, data) => api.put(`/banners/${id}`, data);
export const deleteAd = (id) => api.delete(`/banners/${id}`);

// 友链API
export const getFriends = () => api.get('/friends');
export const addFriend = (data) => api.post('/friends', data);
export const updateFriend = (id, data) => api.put(`/friends/${id}`, data);
export const deleteFriend = (id) => api.delete(`/friends/${id}`);

// 用户API
export const getUserProfile = () => api.get('/users/profile');
export const changePassword = (oldPassword, newPassword) => api.put('/users/password', { oldPassword, newPassword });
export const getUsers = () => api.get('/users');

// 导入API
export const importBookmarks = (file, menuId, subMenuId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('menu_id', menuId);
  if (subMenuId) formData.append('sub_menu_id', subMenuId);
  return api.post('/import', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  });
};

// 备份API
export const exportBackup = () => api.get('/backup/export', { responseType: 'blob' });
export const importBackup = (data, overwrite = false) => api.post('/backup/import', { data, overwrite });

// 统计API
export const recordVisit = () => api.post('/stats/visit');
export const recordCardClick = (cardId) => api.post(`/stats/click/${cardId}`);
export const getStatsSummary = () => api.get('/stats/summary');
export const getClickRanking = (limit = 20) => api.get('/stats/clicks/ranking', { params: { limit } });
