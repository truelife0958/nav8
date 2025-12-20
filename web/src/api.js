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
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin')) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
    // 添加友好错误消息
    error.friendlyMessage = getErrorMessage(error);
    return Promise.reject(error);
  }
);

// 导出错误消息提取函数供组件使用
export { getErrorMessage };

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

// 导入API
export const importBookmarks = (file, menuId, subMenuId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('menu_id', menuId);
  if (subMenuId) formData.append('sub_menu_id', subMenuId);
  return api.post('/import', formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
};

// 备份API
export const exportBackup = () => api.get('/backup/export', { headers: authHeaders(), responseType: 'blob' });
export const importBackup = (data, overwrite = false) => api.post('/backup/import', { data, overwrite }, { headers: authHeaders() });