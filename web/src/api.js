import axios from 'axios';
const BASE = '/api';

// 创建axios实例
const api = axios.create({
  baseURL: BASE,
  timeout: 10000
});

// 响应拦截器 - 处理token过期
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并跳转到登录
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin')) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export const login = (username, password) => api.post('/login', { username, password });

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 菜单相关API
export const getMenus = () => api.get('/menus');
export const addMenu = (data) => api.post('/menus', data, { headers: authHeaders() });
export const updateMenu = (id, data) => api.put(`/menus/${id}`, data, { headers: authHeaders() });
export const deleteMenu = (id) => api.delete(`/menus/${id}`, { headers: authHeaders() });

// 子菜单相关API
export const getSubMenus = (menuId) => api.get(`/menus/${menuId}/submenus`);
export const addSubMenu = (menuId, data) => api.post(`/menus/${menuId}/submenus`, data, { headers: authHeaders() });
export const updateSubMenu = (id, data) => api.put(`/menus/submenus/${id}`, data, { headers: authHeaders() });
export const deleteSubMenu = (id) => api.delete(`/menus/submenus/${id}`, { headers: authHeaders() });

// 卡片相关API
export const getCards = (menuId, subMenuId = null) => {
  const params = subMenuId ? { subMenuId } : {};
  return api.get(`/cards/${menuId}`, { params });
};
export const addCard = (data) => api.post('/cards', data, { headers: authHeaders() });
export const updateCard = (id, data) => api.put(`/cards/${id}`, data, { headers: authHeaders() });
export const deleteCard = (id) => api.delete(`/cards/${id}`, { headers: authHeaders() });
export const batchDeleteCards = (ids) => api.post('/cards/batch/delete', { ids }, { headers: authHeaders() });
export const batchMoveCards = (ids, menu_id, sub_menu_id) => api.post('/cards/batch/move', { ids, menu_id, sub_menu_id }, { headers: authHeaders() });

export const uploadLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api.post('/upload', formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
};

// 广告API
export const getAds = () => api.get('/ads');
export const addAd = (data) => api.post('/ads', data, { headers: authHeaders() });
export const updateAd = (id, data) => api.put(`/ads/${id}`, data, { headers: authHeaders() });
export const deleteAd = (id) => api.delete(`/ads/${id}`, { headers: authHeaders() });

// 友链API
export const getFriends = () => api.get('/friends');
export const addFriend = (data) => api.post('/friends', data, { headers: authHeaders() });
export const updateFriend = (id, data) => api.put(`/friends/${id}`, data, { headers: authHeaders() });
export const deleteFriend = (id) => api.delete(`/friends/${id}`, { headers: authHeaders() });

// 用户API
export const getUserProfile = () => api.get('/users/profile', { headers: authHeaders() });
export const changePassword = (oldPassword, newPassword) => api.put('/users/password', { oldPassword, newPassword }, { headers: authHeaders() });
export const getUsers = () => api.get('/users', { headers: authHeaders() });