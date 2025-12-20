<template>
  <div class="card-manage">
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />
    <div class="card-header">
      <div class="header-content">
        <h2 class="page-title">管理网站导航卡片，支持主菜单和子菜单分类</h2>
      </div>
      <div class="card-add">
        <select v-model="selectedMenuId" class="input narrow" @change="onMenuChange">
          <option v-for="menu in menus" :value="menu.id" :key="menu.id">{{ menu.name }}</option>
        </select>
        <select v-model="selectedSubMenuId" class="input narrow" @change="onSubMenuChange">
          <option value="">主菜单</option>
          <option v-for="subMenu in currentSubMenus" :value="subMenu.id" :key="subMenu.id">{{ subMenu.name }}</option>
        </select>
        <input v-model="newCardTitle" placeholder="卡片标题" class="input narrow" />
        <input v-model="newCardUrl" placeholder="卡片链接" class="input wide" />
        <input v-model="newCardLogo" placeholder="logo链接(可选)" class="input wide" />
        <button class="btn" @click="addCard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          添加卡片
        </button>
        <button class="btn btn-import" @click="showImportModal = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          导入书签
        </button>
        <button class="btn btn-check" @click="checkDuplicates">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          检测重复
        </button>
        <button v-if="duplicateIds.size > 0" class="btn btn-select-dup" @click="selectDuplicates">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <path d="M9 9h6v6H9z"/>
          </svg>
          选中重复({{ duplicateIds.size }})
        </button>
      </div>
    </div>
    
    <!-- 批量操作栏 -->
    <div v-if="selectedCards.length > 0" class="batch-actions">
      <span class="selected-count">已选择 {{ selectedCards.length }} 项</span>
      <div class="batch-move">
        <select v-model="batchTargetMenuId" class="input narrow">
          <option value="">选择目标菜单</option>
          <option v-for="menu in menus" :value="menu.id" :key="menu.id">{{ menu.name }}</option>
        </select>
        <select v-model="batchTargetSubMenuId" class="input narrow">
          <option value="">主菜单</option>
          <option v-for="subMenu in batchTargetSubMenus" :value="subMenu.id" :key="subMenu.id">{{ subMenu.name }}</option>
        </select>
        <button class="btn btn-move" @click="handleBatchMove" :disabled="!batchTargetMenuId">批量移动</button>
      </div>
      <button class="btn btn-danger" @click="handleBatchDelete">批量删除</button>
      <button class="btn btn-cancel" @click="clearSelection">取消选择</button>
    </div>
    
    <div class="card-card">
      <table class="card-table">
        <thead>
          <tr>
            <th class="checkbox-col"><input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" /></th>
            <th>标题</th>
            <th>网址</th>
            <th>Logo链接</th>
            <th>描述</th>
            <th>排序</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="card in cards" :key="card.id" :class="{ selected: selectedCards.includes(card.id), duplicate: duplicateIds.has(card.id) }">
            <td class="checkbox-col"><input type="checkbox" :checked="selectedCards.includes(card.id)" @change="toggleSelect(card.id)" /></td>
            <td><input v-model="card.title" @blur="updateCard(card)" class="table-input" /></td>
            <td><input v-model="card.url" @blur="updateCard(card)" class="table-input" /></td>
            <td><input v-model="card.logo_url" @blur="updateCard(card)" class="table-input" placeholder="logo链接(可选)" /></td>
            <td><input v-model="card.desc" @blur="updateCard(card)" class="table-input" placeholder="描述（可选）" /></td>
            <td><input v-model.number="card.order" type="number" @blur="updateCard(card)" class="table-input order-input" /></td>
            <td>
              <button class="btn btn-danger btn-icon" @click="deleteCard(card.id)" title="删除">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 导入书签弹窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>导入浏览器书签</h3>
          <button @click="showImportModal = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="import-tip">支持导入浏览器导出的书签文件（HTML格式）或 JSON 格式书签文件</p>
          <div class="import-form">
            <div class="form-group">
              <label>目标菜单</label>
              <select v-model="importMenuId" class="input">
                <option v-for="menu in menus" :value="menu.id" :key="menu.id">{{ menu.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>目标子菜单（可选）</label>
              <select v-model="importSubMenuId" class="input">
                <option value="">主菜单</option>
                <option v-for="subMenu in importSubMenus" :value="subMenu.id" :key="subMenu.id">{{ subMenu.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>选择书签文件</label>
              <input type="file" ref="importFileInput" accept=".html,.htm,.json" @change="handleFileSelect" class="file-input" />
            </div>
            <div v-if="importFileName" class="selected-file">
              已选择: {{ importFileName }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="showImportModal = false">取消</button>
          <button class="btn" @click="handleImport" :disabled="!importFile || importing">
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import {
  getMenus,
  getCards,
  addCard as apiAddCard,
  updateCard as apiUpdateCard,
  deleteCard as apiDeleteCard,
  batchDeleteCards,
  batchMoveCards,
  importBookmarks,
  getErrorMessage
} from '../../api';
import Toast from '../../components/Toast.vue';

const menus = ref([]);
const cards = ref([]);
const selectedMenuId = ref();
const selectedSubMenuId = ref('');
const newCardTitle = ref('');
const newCardUrl = ref('');
const newCardLogo = ref('');

// 批量操作相关
const selectedCards = ref([]);
const batchTargetMenuId = ref('');
const batchTargetSubMenuId = ref('');

// 重复检测
const duplicateIds = ref(new Set());

// Toast提示
const toast = ref({ show: false, message: '', type: 'info' });

// 导入书签相关
const showImportModal = ref(false);
const importMenuId = ref('');
const importSubMenuId = ref('');
const importFile = ref(null);
const importFileName = ref('');
const importing = ref(false);
const importFileInput = ref(null);

const importSubMenus = computed(() => {
  if (!importMenuId.value) return [];
  const menu = menus.value.find(m => m.id === importMenuId.value);
  return menu?.subMenus || [];
});

function showToast(message, type = 'info') {
  toast.value = { show: true, message, type };
}

const currentSubMenus = computed(() => {
  if (!selectedMenuId.value) return [];
  const menu = menus.value.find(m => m.id === selectedMenuId.value);
  return menu?.subMenus || [];
});

const batchTargetSubMenus = computed(() => {
  if (!batchTargetMenuId.value) return [];
  const menu = menus.value.find(m => m.id === batchTargetMenuId.value);
  return menu?.subMenus || [];
});

const isAllSelected = computed(() => {
  return cards.value.length > 0 && selectedCards.value.length === cards.value.length;
});

onMounted(async () => {
  const res = await getMenus();
  menus.value = res.data;
  if (menus.value.length) {
    selectedMenuId.value = menus.value[0].id;
    selectedSubMenuId.value = '';
    importMenuId.value = menus.value[0].id;
  }
});

watch(selectedMenuId, () => {
  selectedSubMenuId.value = '';
  selectedCards.value = [];
  loadCards();
});

watch(selectedSubMenuId, () => {
  selectedCards.value = [];
  loadCards();
});

function onMenuChange() {
  selectedSubMenuId.value = '';
}

function onSubMenuChange() {
  loadCards();
}

async function loadCards() {
  if (!selectedMenuId.value) return;
  const res = await getCards(selectedMenuId.value, selectedSubMenuId.value || null);
  cards.value = res.data;
  duplicateIds.value = new Set(); // 清除重复标记
}

// 检测重复卡片（按URL）
function checkDuplicates() {
  const urlMap = new Map();
  const dups = new Set();
  
  for (const card of cards.value) {
    const normalizedUrl = normalizeUrl(card.url);
    if (urlMap.has(normalizedUrl)) {
      dups.add(card.id);
      dups.add(urlMap.get(normalizedUrl));
    } else {
      urlMap.set(normalizedUrl, card.id);
    }
  }
  
  duplicateIds.value = dups;
  
  if (dups.size > 0) {
    showToast(`发现 ${dups.size} 个重复卡片（已高亮显示），可点击"选中重复"批量删除`, 'warning');
  } else {
    showToast('未发现重复卡片', 'success');
  }
}

// 选中所有重复卡片
function selectDuplicates() {
  if (duplicateIds.value.size === 0) {
    showToast('请先检测重复卡片', 'warning');
    return;
  }
  selectedCards.value = [...duplicateIds.value];
  showToast(`已选中 ${selectedCards.value.length} 个重复卡片，可批量删除`, 'info');
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.pathname !== '/') {
      u.pathname = u.pathname.replace(/\/+$/g, '');
    }
    return u.toString().toLowerCase();
  } catch {
    return url.replace(/\/+$/g, '').toLowerCase();
  }
}

// 批量选择相关
function toggleSelect(id) {
  const index = selectedCards.value.indexOf(id);
  if (index > -1) {
    selectedCards.value.splice(index, 1);
  } else {
    selectedCards.value.push(id);
  }
}

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedCards.value = cards.value.map(c => c.id);
  } else {
    selectedCards.value = [];
  }
}

function clearSelection() {
  selectedCards.value = [];
}

// 批量删除
async function handleBatchDelete() {
  if (!confirm(`确定要删除选中的 ${selectedCards.value.length} 个卡片吗？`)) return;
  try {
    await batchDeleteCards(selectedCards.value);
    showToast(`成功删除 ${selectedCards.value.length} 个卡片`, 'success');
    selectedCards.value = [];
    loadCards();
  } catch (error) {
    showToast('批量删除失败: ' + getErrorMessage(error), 'error');
  }
}

// 批量移动
async function handleBatchMove() {
  if (!batchTargetMenuId.value) {
    showToast('请选择目标菜单', 'warning');
    return;
  }
  try {
    await batchMoveCards(selectedCards.value, batchTargetMenuId.value, batchTargetSubMenuId.value || null);
    showToast(`成功移动 ${selectedCards.value.length} 个卡片`, 'success');
    selectedCards.value = [];
    batchTargetMenuId.value = '';
    batchTargetSubMenuId.value = '';
    loadCards();
  } catch (error) {
    showToast('批量移动失败: ' + getErrorMessage(error), 'error');
  }
}

async function addCard() {
  if (!newCardTitle.value || !newCardUrl.value) {
    showToast('请填写卡片标题和链接', 'warning');
    return;
  }
  try {
    await apiAddCard({
      menu_id: selectedMenuId.value,
      sub_menu_id: selectedSubMenuId.value || null,
      title: newCardTitle.value,
      url: newCardUrl.value,
      logo_url: newCardLogo.value
    });
    newCardTitle.value = '';
    newCardUrl.value = '';
    newCardLogo.value = '';
    showToast('添加卡片成功', 'success');
    loadCards();
  } catch (error) {
    showToast('添加卡片失败: ' + getErrorMessage(error), 'error');
  }
}

async function updateCard(card) {
  try {
    await apiUpdateCard(card.id, {
      menu_id: card.menu_id || selectedMenuId.value,
      sub_menu_id: card.sub_menu_id !== undefined ? card.sub_menu_id : (selectedSubMenuId.value || null),
      title: card.title,
      url: card.url,
      logo_url: card.logo_url,
      desc: card.desc,
      order: card.order
    });
    showToast('更新成功', 'success');
  } catch (error) {
    showToast('更新卡片失败: ' + getErrorMessage(error), 'error');
    loadCards(); // 更新失败时重新加载恢复数据
  }
}

async function deleteCard(id) {
  if (!confirm('确定要删除这个卡片吗？')) return;
  try {
    await apiDeleteCard(id);
    showToast('删除成功', 'success');
    loadCards();
  } catch (error) {
    showToast('删除卡片失败: ' + getErrorMessage(error), 'error');
  }
}

// 导入书签相关
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    importFile.value = file;
    importFileName.value = file.name;
  }
}

async function handleImport() {
  if (!importFile.value) {
    showToast('请选择书签文件', 'warning');
    return;
  }
  if (!importMenuId.value) {
    showToast('请选择目标菜单', 'warning');
    return;
  }

  importing.value = true;
  try {
    const targetMenuId = importMenuId.value;
    const targetSubMenuId = importSubMenuId.value || '';

    const res = await importBookmarks(importFile.value, targetMenuId, targetSubMenuId || null);
    showToast(`成功导入 ${res.data.imported}/${res.data.total} 个书签`, 'success');

    showImportModal.value = false;
    importFile.value = null;
    importFileName.value = '';
    if (importFileInput.value) importFileInput.value.value = '';

    // 导入完成后自动切换到目标菜单/子菜单并刷新
    if (selectedMenuId.value !== targetMenuId) {
      selectedMenuId.value = targetMenuId;
    }
    if (selectedSubMenuId.value !== targetSubMenuId) {
      selectedSubMenuId.value = targetSubMenuId;
    }
    await loadCards();
  } catch (error) {
    showToast('导入失败: ' + getErrorMessage(error), 'error');
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.card-manage {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  width: 95%;
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



.card-add {
  margin: 0 auto;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.card-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
}

.card-table {
  width: 100%;
  border-collapse: collapse;
  padding: 24px;
}

.card-table th,
.card-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.card-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

/* 表格列宽度设置 */
.card-table th:nth-child(1), /* 标题列 */
.card-table td:nth-child(1) {
  width: 12%;
}

.card-table th:nth-child(2), /* 网址列 */
.card-table td:nth-child(2) {
  width: 25%;
}

.card-table th:nth-child(3), /* Logo链接列 */
.card-table td:nth-child(3) {
  width: 25%;
}

.card-table th:nth-child(4), /* 描述列 */
.card-table td:nth-child(4) {
  width: 15%;
}

.card-table th:nth-child(5), /* 排序列 */
.card-table td:nth-child(5) {
  width: 8%;
}

.card-table th:nth-child(6), /* 操作列 */
.card-table td:nth-child(6) {
  width: 15%;
  text-align: center;
}

.input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

/* 窄输入框 - 主菜单、子菜单、卡片标题 */
.input.narrow {
  width: 140px;
}

/* 中等输入框 - 添加卡片按钮 */
.input.medium {
  width: 140px;
}

/* 宽输入框 - 卡片链接、logo链接 */
.input.wide {
  width: 200px;
}

/* 表格内输入框 */
.table-input {
  width: 100%;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.table-input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

.input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 3px rgba(57, 157, 255, 0.1);
}

.order-input {
  width: 60px;
}

.btn {
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: #399dff;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  border-radius: 6px;
}

.btn:hover {
  background: #2d7dd2;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-move {
  background: #10b981;
}

.btn-move:hover {
  background: #059669;
}

.btn-move:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-cancel {
  background: #6b7280;
}

.btn-cancel:hover {
  background: #4b5563;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  margin-bottom: 16px;
  width: 95%;
  flex-wrap: wrap;
}

.selected-count {
  font-weight: 600;
  color: #92400e;
}

.batch-move {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 复选框列 */
.checkbox-col {
  width: 40px !important;
  text-align: center !important;
}

.checkbox-col input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 选中行高亮 */
tr.selected {
  background: #eff6ff;
}

/* 重复卡片高亮 */
tr.duplicate {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}
tr.duplicate td {
  color: #dc2626;
}

/* 导入按钮 */
.btn-import {
  background: #8b5cf6;
}
.btn-import:hover {
  background: #7c3aed;
}

/* 检测重复按钮 */
.btn-check {
  background: #f59e0b;
}
.btn-check:hover {
  background: #d97706;
}

/* 选中重复按钮 */
.btn-select-dup {
  background: #ef4444;
}
.btn-select-dup:hover {
  background: #dc2626;
}

/* 导入弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 12px;
  width: 450px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #1f2937;
}
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6b7280;
}
.close-btn:hover {
  color: #ef4444;
}
.modal-body {
  padding: 20px;
}
.import-tip {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 16px 0;
}
.import-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}
.form-group .input {
  width: 100%;
}
.file-input {
  padding: 8px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
}
.selected-file {
  color: #059669;
  font-size: 0.85rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .card-manage {
    width: 94%;
    padding: 16px;
  }
  
  .card-card {
    padding: 16px 12px;
  }
  
  .card-add {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .input.narrow,
  .input.medium,
  .input.wide {
    width: 100%;
  }
  
  .order-input {
    width: 60px;
  }
  
  /* 移动端表格列宽度调整 */
  .card-table th:nth-child(1),
  .card-table td:nth-child(1),
  .card-table th:nth-child(2),
  .card-table td:nth-child(2),
  .card-table th:nth-child(3),
  .card-table td:nth-child(3),
  .card-table th:nth-child(4),
  .card-table td:nth-child(4),
  .card-table th:nth-child(5),
  .card-table td:nth-child(5),
  .card-table th:nth-child(6),
  .card-table td:nth-child(6) {
    width: auto;
  }
}
</style> 