<template>
  <div class="menu-manage">
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />
    <div class="menu-header">
      <div class="header-content">
        <h2 class="page-title">管理主菜单和子菜单</h2>
      </div>
      <div class="menu-add">
        <input v-model="newMenuName" placeholder="请输入主菜单名称" class="input" />
        <button class="btn btn-primary" @click="addMenu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          添加主菜单
        </button>
      </div>
    </div>
    
    <div class="menu-content">
      <div class="menu-list">
        <div v-for="(menu, index) in menus" :key="menu.id"
             class="menu-item"
             :class="{ 'dragging': menuDragIndex === index, 'drag-over': menuDropIndex === index && menuDragIndex !== index }"
             @dragover.prevent="onMenuDragOver($event, index)"
             @drop="onMenuDrop($event, index)">
          <!-- 主菜单 -->
          <div class="main-menu">
            <div class="menu-info">
              <span class="menu-drag-handle"
                    draggable="true"
                    @dragstart="onMenuDragStart($event, index)"
                    @dragend="onMenuDragEnd"
                    title="拖拽排序">⋮⋮</span>
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                </svg>
              </div>
              <input v-model="menu.name" @blur="updateMenu(menu)" class="menu-name-input" />
              <div class="menu-order">
                <span class="order-label">排序</span>
                <input v-model.number="menu.order" type="number" @blur="updateMenu(menu)" class="order-input" />
              </div>
            </div>
            <div class="menu-actions">
              <button class="btn btn-icon expand-btn" @click="toggleSubMenu(menu.id)" :title="menu.showSubMenu ? '收起子菜单' : '展开子菜单'">
                <svg v-if="menu.showSubMenu" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m18 15-6-6-6 6"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              <button class="btn btn-danger btn-icon" @click="deleteMenu(menu.id)" title="删除主菜单">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 子菜单区域 -->
          <div class="sub-menu-section" :class="{ 'expanded': menu.showSubMenu }">
            <div class="sub-menu-header">
              <div class="sub-menu-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11H1l8-8 8 8h-8v8z"/>
                </svg>
                子菜单 ({{ menu.subMenus?.length || 0 }})
              </div>
              <button class="btn btn-sm btn-outline" @click="addSubMenu(menu.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                添加子菜单
              </button>
            </div>
            
            <div class="sub-menu-list" v-if="menu.subMenus && menu.subMenus.length > 0">
              <div v-for="(subMenu, subIndex) in menu.subMenus" :key="subMenu.id"
                   class="sub-menu-item"
                   :class="{ 'dragging': subMenuDragData?.menuId === menu.id && subMenuDragData?.index === subIndex, 'drag-over': subMenuDropData?.menuId === menu.id && subMenuDropData?.index === subIndex && !(subMenuDragData?.menuId === menu.id && subMenuDragData?.index === subIndex) }"
                   @dragover.prevent="onSubMenuDragOver($event, menu.id, subIndex)"
                   @drop="onSubMenuDrop($event, menu.id, subIndex)">
                <div class="sub-menu-info">
                  <span class="sub-menu-drag-handle"
                        draggable="true"
                        @dragstart="onSubMenuDragStart($event, menu.id, subIndex)"
                        @dragend="onSubMenuDragEnd"
                        title="拖拽排序">⋮⋮</span>
                  <div class="sub-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                  </div>
                  <input v-model="subMenu.name" @blur="updateSubMenu(subMenu)" class="sub-menu-name-input" />
                  <div class="sub-menu-order">
                    <input v-model.number="subMenu.order" type="number" @blur="updateSubMenu(subMenu)" class="order-input" />
                  </div>
                </div>
                <div class="sub-menu-actions">
                  <button class="btn btn-danger btn-icon btn-sm" @click="deleteSubMenu(subMenu.id)" title="删除子菜单">
                    <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-sub-menu">
              <p>暂无子菜单</p>
              <button class="btn btn-sm btn-outline" @click="addSubMenu(menu.id)">添加第一个子菜单</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  getMenus,
  addMenu as apiAddMenu,
  updateMenu as apiUpdateMenu,
  deleteMenu as apiDeleteMenu,
  addSubMenu as apiAddSubMenu,
  updateSubMenu as apiUpdateSubMenu,
  deleteSubMenu as apiDeleteSubMenu,
  batchReorderMenus,
  batchReorderSubMenus,
  getErrorMessage
} from '../../api';
import Toast from '../../components/Toast.vue';

const menus = ref([]);
const newMenuName = ref('');

// Toast提示
const toast = ref({ show: false, message: '', type: 'info' });

// 主菜单拖拽相关
const menuDragIndex = ref(null);
const menuDropIndex = ref(null);

// 子菜单拖拽相关
const subMenuDragData = ref(null);
const subMenuDropData = ref(null);

function showToast(message, type = 'info') {
  toast.value = { show: true, message, type };
}

onMounted(loadMenus);

async function loadMenus() {
  const res = await getMenus();
  // 保留现有的展开状态
  const existingStatus = {};
  menus.value.forEach(m => {
    existingStatus[m.id] = m.showSubMenu;
  });

  menus.value = res.data.map(menu => ({
    ...menu,
    showSubMenu: existingStatus[menu.id] || false
  }));
}

async function addMenu() {
  if (!newMenuName.value.trim()) {
    showToast('请输入菜单名称', 'warning');
    return;
  }
  try {
    const maxOrder = menus.value.length
      ? Math.max(...menus.value.map(m => m.order || 0))
      : 0;
    await apiAddMenu({ name: newMenuName.value.trim(), order: maxOrder + 1 });
    newMenuName.value = '';
    showToast('添加菜单成功', 'success');
    loadMenus();
  } catch (error) {
    showToast('添加菜单失败: ' + getErrorMessage(error), 'error');
  }
}

async function updateMenu(menu) {
  try {
    await apiUpdateMenu(menu.id, { name: menu.name, order: menu.order });
    showToast('更新菜单成功', 'success');
    loadMenus();
  } catch (error) {
    showToast('更新菜单失败: ' + getErrorMessage(error), 'error');
  }
}

async function deleteMenu(id) {
  if (!confirm('确定要删除这个主菜单吗？删除后将同时删除其下的所有子菜单和卡片。')) return;
  try {
    await apiDeleteMenu(id);
    showToast('删除成功', 'success');
    loadMenus();
  } catch (error) {
    showToast('删除菜单失败: ' + getErrorMessage(error), 'error');
  }
}

async function addSubMenu(menuId) {
  const menu = menus.value.find(m => m.id === menuId);
  const subMenuName = prompt('请输入子菜单名称：');
  if (!subMenuName?.trim()) return;

  try {
    const maxOrder = menu.subMenus?.length
      ? Math.max(...menu.subMenus.map(sm => sm.order || 0))
      : 0;
    await apiAddSubMenu(menuId, { name: subMenuName.trim(), order: maxOrder + 1 });
    showToast('添加子菜单成功', 'success');
    // 自动展开
    if (menu) menu.showSubMenu = true;
    loadMenus();
  } catch (error) {
    showToast('添加子菜单失败: ' + getErrorMessage(error), 'error');
  }
}

async function updateSubMenu(subMenu) {
  try {
    await apiUpdateSubMenu(subMenu.id, { name: subMenu.name, order: subMenu.order });
    showToast('更新子菜单成功', 'success');
    loadMenus();
  } catch (error) {
    showToast('更新子菜单失败: ' + getErrorMessage(error), 'error');
  }
}

async function deleteSubMenu(id) {
  if (!confirm('确定要删除这个子菜单吗？删除后将同时删除其下的所有卡片。')) return;
  try {
    await apiDeleteSubMenu(id);
    showToast('删除成功', 'success');
    loadMenus();
  } catch (error) {
    showToast('删除子菜单失败: ' + getErrorMessage(error), 'error');
  }
}

function toggleSubMenu(menuId) {
  const menu = menus.value.find(m => m.id === menuId);
  if (menu) {
    menu.showSubMenu = !menu.showSubMenu;
  }
}

// 主菜单拖拽排序
function onMenuDragStart(e, index) {
  menuDragIndex.value = index;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', `menu-${index}`);
}

function onMenuDragOver(e, index) {
  if (menuDragIndex.value !== null) {
    menuDropIndex.value = index;
  }
}

async function onMenuDrop(e, index) {
  if (menuDragIndex.value === null || menuDragIndex.value === index) {
    menuDragIndex.value = null;
    menuDropIndex.value = null;
    return;
  }
  
  const draggedMenu = menus.value[menuDragIndex.value];
  menus.value.splice(menuDragIndex.value, 1);
  menus.value.splice(index, 0, draggedMenu);
  
  // 更新排序值
  const orders = menus.value.map((menu, i) => ({ id: menu.id, order: i }));
  try {
    await batchReorderMenus(orders);
    menus.value.forEach((menu, i) => menu.order = i);
    showToast('菜单排序已更新', 'success');
  } catch (error) {
    showToast('排序更新失败: ' + getErrorMessage(error), 'error');
    loadMenus();
  }
  
  menuDragIndex.value = null;
  menuDropIndex.value = null;
}

function onMenuDragEnd() {
  menuDragIndex.value = null;
  menuDropIndex.value = null;
}

// 子菜单拖拽排序
function onSubMenuDragStart(e, menuId, index) {
  subMenuDragData.value = { menuId, index };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', `submenu-${menuId}-${index}`);
}

function onSubMenuDragOver(e, menuId, index) {
  if (subMenuDragData.value !== null && subMenuDragData.value.menuId === menuId) {
    subMenuDropData.value = { menuId, index };
  }
}

async function onSubMenuDrop(e, menuId, index) {
  if (!subMenuDragData.value || subMenuDragData.value.menuId !== menuId || subMenuDragData.value.index === index) {
    subMenuDragData.value = null;
    subMenuDropData.value = null;
    return;
  }
  
  const menu = menus.value.find(m => m.id === menuId);
  if (!menu || !menu.subMenus) return;
  
  const draggedSubMenu = menu.subMenus[subMenuDragData.value.index];
  menu.subMenus.splice(subMenuDragData.value.index, 1);
  menu.subMenus.splice(index, 0, draggedSubMenu);
  
  // 更新排序值
  const orders = menu.subMenus.map((subMenu, i) => ({ id: subMenu.id, order: i }));
  try {
    await batchReorderSubMenus(orders);
    menu.subMenus.forEach((subMenu, i) => subMenu.order = i);
    showToast('子菜单排序已更新', 'success');
  } catch (error) {
    showToast('排序更新失败: ' + getErrorMessage(error), 'error');
    loadMenus();
  }
  
  subMenuDragData.value = null;
  subMenuDropData.value = null;
}

function onSubMenuDragEnd() {
  subMenuDragData.value = null;
  subMenuDropData.value = null;
}
</script>

<style scoped>
.menu-manage {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}



.menu-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  width: 94%;
  text-align: center;
}

.header-content {
  margin-bottom: 15px;
  text-align: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}



.menu-add {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.menu-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
}

.menu-list {
  padding: 0;
}

.menu-item {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.3s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f8fafc;
}

.menu-item.dragging {
  opacity: 0.5;
  background: #e0f2fe !important;
}

.menu-item.drag-over {
  border-top: 3px solid #667eea;
}

.main-menu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  background: white;
  transition: all 0.3s ease;
}

.menu-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

/* 主菜单拖拽手柄 */
.menu-drag-handle {
  cursor: grab;
  color: #9ca3af;
  font-size: 16px;
  user-select: none;
  padding: 8px 4px;
  display: inline-block;
  margin-right: 8px;
}

.menu-drag-handle:hover {
  color: #667eea;
  background: #f0f4ff;
  border-radius: 4px;
}

.menu-drag-handle:active {
  cursor: grabbing;
}

.menu-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.menu-name-input {
  font-size: 1.1rem;
  font-weight: 600;
  border: 2px solid transparent;
  background: transparent;
  padding: 8px 12px;
  border-radius: 8px;
  color: #1e293b;
  min-width: 200px;
  transition: all 0.2s ease;
}

.menu-name-input:focus {
  outline: none;
  border-color: #667eea;
  background: #f8fafc;
}

.menu-order {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-label {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.order-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
}

.order-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.menu-actions {
  display: flex;
  gap: 8px;
}

.sub-menu-section {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.sub-menu-section.expanded {
  max-height: 1000px;
}

.sub-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 32px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.sub-menu-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #475569;
  font-size: 0.95rem;
}

.sub-menu-list {
  padding: 16px 32px 16px 48px;
  position: relative;
}

.sub-menu-list::before {
  content: '';
  position: absolute;
  left: 32px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #e2e8f0, #cbd5e1);
  border-radius: 1px;
}

.sub-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  position: relative;
}

.sub-menu-item::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 50%;
  width: 12px;
  height: 2px;
  background: #cbd5e1;
  transform: translateY(-50%);
  border-radius: 1px;
}

.sub-menu-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.sub-menu-item:last-child {
  margin-bottom: 0;
}

.sub-menu-item.dragging {
  opacity: 0.5;
  background: #d1fae5 !important;
}

.sub-menu-item.drag-over {
  border-top: 3px solid #10b981;
}

.sub-menu-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

/* 子菜单拖拽手柄 */
.sub-menu-drag-handle {
  cursor: grab;
  color: #9ca3af;
  font-size: 14px;
  user-select: none;
  padding: 6px 4px;
  display: inline-block;
}

.sub-menu-drag-handle:hover {
  color: #10b981;
  background: #ecfdf5;
  border-radius: 4px;
}

.sub-menu-drag-handle:active {
  cursor: grabbing;
}

.sub-menu-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.sub-menu-name-input {
  font-size: 1rem;
  border: 2px solid transparent;
  background: transparent;
  padding: 6px 10px;
  border-radius: 6px;
  color: #374151;
  min-width: 150px;
  transition: all 0.2s ease;
}

.sub-menu-name-input:focus {
  outline: none;
  border-color: #10b981;
  background: #f0fdf4;
}

.sub-menu-order {
  display: flex;
  align-items: center;
}

.sub-menu-actions {
  display: flex;
  gap: 6px;
}

.empty-sub-menu {
  padding: 10px 0px 10px 0px;
  text-align: center;
  color: #64748b;
}

.empty-sub-menu p {
  color: #079f1e;
  margin: 0 0 16px 0;
  font-size: 1rem;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(82deg, #667eea, #2f025d);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  justify-content: center;
  border-radius: 8px;
}

/* 展开子菜单按钮样式 */
.btn-icon.expand-btn {
  width: 200px;
  height: 36px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn-icon.btn-sm {
  width: 35px;
  height: 30px;
}

.input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  min-width: 200px;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input::placeholder {
  color: #94a3b8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .menu-manage {
    width: 93%;
    padding: 16px;
  }
  
  .menu-header {
    padding: 24px 20px;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .menu-add {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input {
    min-width: 0;
  }
  
  .main-menu {
    padding: 20px;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .menu-info {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .menu-name-input {
    min-width: 0;
  }
  
  .menu-order {
    justify-content: center;
  }
  
  .menu-actions {
    justify-content: center;
  }
  
  .btn-icon.expand-btn {
    width: 40px;
    height: 32px;
  }
  
  .sub-menu-header {
    padding: 16px 20px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .sub-menu-list {
    padding: 12px 20px 12px 32px;
  }
  
  .sub-menu-list::before {
    left: 20px;
  }
  
  .sub-menu-item::before {
    left: -12px;
    width: 8px;
  }
  
  .sub-menu-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .sub-menu-info {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .sub-menu-name-input {
    min-width: 0;
  }
  
  .sub-menu-order {
    justify-content: center;
  }
  
  .sub-menu-actions {
    justify-content: center;
  }
  
  .empty-sub-menu {
    padding: 10px 0px 10px 0px;
  }
}
</style>
