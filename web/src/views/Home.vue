<template>
  <div class="home-container">
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />

    <div class="menu-bar-fixed">
      <MenuBar
        :menus="visibleMenus"
        :activeId="activeMenu?.id"
        :activeSubMenuId="activeSubMenu?.id"
        @select="selectMenu"
      />
    </div>

    <div class="search-section">
      <div class="search-box-wrapper">
        <div class="search-engine-select">
          <button v-for="engine in searchEngines" :key="engine.name"
            :class="['engine-btn', {active: selectedEngine.name === engine.name}]"
            @click="selectEngine(engine)"
          >
            {{ engine.label }}
          </button>
        </div>
        <div class="search-container" :class="{ 'history-open': showHistory }">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="selectedEngine.placeholder"
            class="search-input"
            @keyup.enter="handleSearch"
            @focus="showHistory = searchHistory.length > 0"
            @blur="hideHistoryDelayed"
          />
          <button v-if="searchQuery" class="clear-btn" @click="clearSearch" aria-label="清空" title="clear">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
          <button @click="handleSearch" class="search-btn" title="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <!-- 搜索历史下拉 -->
          <div v-if="showHistory && searchHistory.length > 0" class="search-history">
            <div class="history-header">
              <span>搜索历史</span>
              <button @click.stop="clearHistory" class="clear-history-btn">清空</button>
            </div>
            <div v-for="(item, index) in searchHistory" :key="index"
                 class="history-item"
                 @mousedown.prevent="selectHistory(item)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <span>{{ item }}</span>
              <button @mousedown.prevent.stop="removeHistory(index)" class="remove-history-btn">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 左侧广告条 -->
    <div v-if="leftAds.length" class="ad-space-fixed left-ad-fixed">
      <a v-for="ad in leftAds" :key="ad.id" :href="ad.url" target="_blank">
        <img :src="ad.img" alt="广告" />
      </a>
    </div>
    <!-- 右侧广告条 -->
    <div v-if="rightAds.length" class="ad-space-fixed right-ad-fixed">
      <a v-for="ad in rightAds" :key="ad.id" :href="ad.url" target="_blank">
        <img :src="ad.img" alt="广告" />
      </a>
    </div>

    <!-- 子菜单横向滑动区域 -->
    <div v-if="visibleSubMenus.length > 0 && !isSearching" class="sub-menu-section">
      <div class="sub-menu-scroll">
        <button
          v-if="hasMainCategoryCards"
          @click="selectMainCategory"
          :class="['sub-menu-btn', { active: activeSubMenu === null }]"
        >
          常用访问
        </button>
        <button
          v-for="subMenu in visibleSubMenus"
          :key="subMenu.id"
          @click="selectSubMenu(subMenu)"
          :class="['sub-menu-btn', { active: activeSubMenu?.id === subMenu.id }]"
        >
          {{ subMenu.name }}
        </button>
      </div>
      <div class="sub-menu-divider"></div>
    </div>

    <!-- 搜索结果提示 -->
    <div v-if="isSearching" class="search-result-tip">
      <p>搜索结果: "{{ searchQuery }}"</p>
      <button @click="exitSearch" class="exit-search-btn">退出搜索</button>
    </div>

    <!-- 卡片区域 - 带过渡动画 -->
    <Transition name="fade" mode="out-in">
      <div :key="cardKey" class="card-wrapper">
        <!-- 骨架屏 - 仅首次加载时显示 -->
        <div v-if="initialLoading" class="skeleton-grid">
          <div v-for="i in 12" :key="i" class="skeleton-card">
            <div class="skeleton-icon"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
        <!-- 空状态 -->
        <div v-else-if="displayCards.length === 0 && !isSearching" class="empty-state">
          <p>暂无内容</p>
        </div>
        <!-- 卡片列表 -->
        <CardGrid v-else :cards="displayCards"/>
      </div>
    </Transition>

    <footer class="footer">
      <div class="footer-content">
        <div class="footer-links">
          <button @click="showFriendLinks = true" class="friend-link-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            友情链接
          </button>
          <router-link to="/admin" class="admin-link-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            后台管理
          </router-link>
        </div>
        <p class="copyright">Copyright © 2025 Nav8 | <a href="https://github.com/truelife0958/nav8" target="_blank" class="footer-link">Powered by truelife0958</a></p>
      </div>
    </footer>

    <!-- 友情链接弹窗 -->
    <div v-if="showFriendLinks" class="modal-overlay" @click="showFriendLinks = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>友情链接</h3>
          <button @click="showFriendLinks = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="friend-links-grid">
            <a
              v-for="friend in friendLinks"
              :key="friend.id"
              :href="friend.url"
              target="_blank"
              class="friend-link-card"
            >
              <div class="friend-link-logo">
                <img
                  v-if="friend.logo && !brokenFriendLogoIds.has(friend.id)"
                  :src="friend.logo"
                  :alt="friend.title"
                  @error="() => markFriendLogoBroken(friend.id)"
                />
                <div v-else class="friend-link-placeholder">
                  {{ friend.title.charAt(0) }}
                </div>
              </div>
              <div class="friend-link-info">
                <h4>{{ friend.title }}</h4>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { getMenus, getCards, getAds, getFriends, searchCards, recordVisit, getErrorMessage } from '../api';
import MenuBar from '../components/MenuBar.vue';
import CardGrid from '../components/CardGrid.vue';
import Toast from '../components/Toast.vue';

const menus = ref([]);
const activeMenu = ref(null);
const activeSubMenu = ref(null);
const cards = ref([]);
const searchResults = ref([]);
const searchQuery = ref('');
const isSearching = ref(false);
const searchHistory = ref([]);
const showHistory = ref(false);
const leftAds = ref([]);
const rightAds = ref([]);
const showFriendLinks = ref(false);
const friendLinks = ref([]);

// 优化：只保留首次加载状态
const initialLoading = ref(true);

// 缓存：存储已加载的卡片数据
const cardsCache = ref(new Map());

// 标记所有菜单是否已预加载完成
const allMenusPreloaded = ref(false);

// 用于触发过渡动画的key
const cardKey = computed(() => {
  if (isSearching.value) return 'search';
  if (!activeMenu.value) return 'none';
  return `${activeMenu.value.id}-${activeSubMenu.value?.id || 'main'}`;
});

const toast = ref({ show: false, message: '', type: 'info' });
const brokenFriendLogoIds = ref(new Set());

function showToast(message, type = 'info') {
  toast.value = { show: true, message, type };
}

function markFriendLogoBroken(friendId) {
  const next = new Set(brokenFriendLogoIds.value);
  next.add(friendId);
  brokenFriendLogoIds.value = next;
}

// 聚合搜索配置
const searchEngines = [
  {
    name: 'google',
    label: 'Google',
    placeholder: 'Google 搜索...',
    url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`
  },
  {
    name: 'baidu',
    label: '百度',
    placeholder: '百度搜索...',
    url: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`
  },
  {
    name: 'bing',
    label: 'Bing',
    placeholder: 'Bing 搜索...',
    url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`
  },
  {
    name: 'github',
    label: 'GitHub',
    placeholder: 'GitHub 搜索...',
    url: q => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`
  },
  {
    name: 'linuxdo',
    label: 'Linux.do',
    placeholder: 'Linux.do 搜索...',
    url: q => `https://linux.do/search?q=${encodeURIComponent(q)}`
  },
  {
    name: 'site',
    label: '站内',
    placeholder: '站内搜索...',
    url: q => `/search?query=${encodeURIComponent(q)}`
  }
];
const selectedEngine = ref(searchEngines[0]);

function selectEngine(engine) {
  selectedEngine.value = engine;
}

function clearSearch() {
  searchQuery.value = '';
  if (isSearching.value) {
    exitSearch();
  }
}

// 搜索历史相关
function loadSearchHistory() {
  try {
    const saved = localStorage.getItem('searchHistory');
    searchHistory.value = saved ? JSON.parse(saved) : [];
  } catch { searchHistory.value = []; }
}

function saveSearchHistory(query) {
  if (!query.trim()) return;
  const history = searchHistory.value.filter(h => h !== query);
  history.unshift(query);
  searchHistory.value = history.slice(0, 10);
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value));
}

function selectHistory(item) {
  searchQuery.value = item;
  showHistory.value = false;
  handleSearch();
}

function removeHistory(index) {
  searchHistory.value.splice(index, 1);
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value));
}

function clearHistory() {
  searchHistory.value = [];
  localStorage.removeItem('searchHistory');
  showHistory.value = false;
}

function hideHistoryDelayed() {
  setTimeout(() => { showHistory.value = false; }, 200);
}

function exitSearch() {
  isSearching.value = false;
  searchResults.value = [];
}

// 显示的卡片
const displayCards = computed(() => {
  if (isSearching.value) return searchResults.value;
  return cards.value;
});

// 过滤空分类：只显示有卡片的主菜单（预加载完成后才过滤）
const visibleMenus = computed(() => {
  // 预加载未完成时显示所有菜单
  if (!allMenusPreloaded.value) return menus.value;

  return menus.value.filter(menu => {
    // 检查主菜单本身是否有卡片（缓存中）
    const mainKey = `${menu.id}-main`;
    const mainCards = cardsCache.value.get(mainKey);
    if (mainCards && mainCards.length > 0) return true;

    // 检查子菜单是否有卡片
    if (menu.subMenus && menu.subMenus.length > 0) {
      for (const sub of menu.subMenus) {
        const subKey = `${menu.id}-${sub.id}`;
        const subCards = cardsCache.value.get(subKey);
        if (subCards && subCards.length > 0) return true;
      }
    }

    return false;
  });
});

// 过滤空子菜单：只显示有卡片的子菜单（预加载完成后才过滤）
const visibleSubMenus = computed(() => {
  if (!activeMenu.value?.subMenus) return [];

  // 预加载未完成时显示所有子菜单
  if (!allMenusPreloaded.value) return activeMenu.value.subMenus;

  return activeMenu.value.subMenus.filter(sub => {
    const subKey = `${activeMenu.value.id}-${sub.id}`;
    const subCards = cardsCache.value.get(subKey);
    return subCards && subCards.length > 0;
  });
});

// 检查主分类是否有卡片（预加载完成后才判断）
const hasMainCategoryCards = computed(() => {
  if (!activeMenu.value) return false;

  // 预加载未完成时显示
  if (!allMenusPreloaded.value) return true;

  const mainKey = `${activeMenu.value.id}-main`;
  const mainCards = cardsCache.value.get(mainKey);
  return mainCards && mainCards.length > 0;
});

// 获取缓存key
function getCacheKey(menuId, subMenuId) {
  return `${menuId}-${subMenuId || 'main'}`;
}

onMounted(async () => {
  loadSearchHistory();

  try {
    // 并行加载菜单、广告、友链
    const [menuRes, adRes, friendRes] = await Promise.all([
      getMenus(),
      getAds().catch(() => ({ data: [] })),
      getFriends().catch(() => ({ data: [] }))
    ]);

    menus.value = menuRes.data;
    leftAds.value = adRes.data.filter(ad => ad.position === 'left');
    rightAds.value = adRes.data.filter(ad => ad.position === 'right');
    friendLinks.value = friendRes.data;

    if (menus.value.length) {
      activeMenu.value = menus.value[0];
      activeSubMenu.value = null;

      // 预加载所有菜单的卡片数据
      await preloadAllMenuCards();
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    showToast('加载数据失败：' + getErrorMessage(error), 'error');
  } finally {
    initialLoading.value = false;
  }

  // 记录访问
  recordVisit().catch(() => {});
});

// 预加载所有菜单的卡片数据
async function preloadAllMenuCards() {
  const promises = [];

  for (const menu of menus.value) {
    // 加载主分类卡片
    const mainKey = getCacheKey(menu.id, null);
    promises.push(
      getCards(menu.id, null)
        .then(res => {
          cardsCache.value.set(mainKey, res.data);
          // 如果是当前选中的，更新显示
          if (activeMenu.value?.id === menu.id && !activeSubMenu.value) {
            cards.value = res.data;
          }
        })
        .catch(() => cardsCache.value.set(mainKey, []))
    );

    // 加载所有子分类卡片
    if (menu.subMenus) {
      for (const sub of menu.subMenus) {
        const subKey = getCacheKey(menu.id, sub.id);
        promises.push(
          getCards(menu.id, sub.id)
            .then(res => cardsCache.value.set(subKey, res.data))
            .catch(() => cardsCache.value.set(subKey, []))
        );
      }
    }
  }

  await Promise.all(promises);
  allMenusPreloaded.value = true;
}

async function selectMenu(menu, parentMenu = null) {
  exitSearch();

  if (parentMenu) {
    activeMenu.value = parentMenu;
    activeSubMenu.value = menu;
  } else {
    activeMenu.value = menu;
    activeSubMenu.value = null;
  }

  await loadCards();
}

async function selectSubMenu(subMenu) {
  exitSearch();
  activeSubMenu.value = subMenu;
  await loadCards();
}

async function selectMainCategory() {
  exitSearch();
  activeSubMenu.value = null;
  await loadCards();
}

async function loadCards() {
  if (!activeMenu.value) return;

  const cacheKey = getCacheKey(activeMenu.value.id, activeSubMenu.value?.id);

  // 优先使用缓存（预加载后肯定有缓存）
  if (cardsCache.value.has(cacheKey)) {
    cards.value = cardsCache.value.get(cacheKey);
    return;
  }

  // 兜底：如果没有缓存，直接加载（不显示loading）
  try {
    const res = await getCards(activeMenu.value.id, activeSubMenu.value?.id);
    cards.value = res.data;
    cardsCache.value.set(cacheKey, res.data);
  } catch (error) {
    console.error('加载卡片失败:', error);
    cards.value = [];
  }
}

// 后台静默刷新缓存（暂时不用，预加载已覆盖）
async function refreshCache(cacheKey) {
  try {
    const [menuId, subId] = cacheKey.split('-');
    const subMenuId = subId === 'main' ? null : parseInt(subId);
    const res = await getCards(parseInt(menuId), subMenuId);
    cardsCache.value.set(cacheKey, res.data);
    // 如果还是当前显示的，更新数据
    if (getCacheKey(activeMenu.value?.id, activeSubMenu.value?.id) === cacheKey) {
      cards.value = res.data;
    }
  } catch (e) {
    // 静默失败，不影响用户体验
  }
}

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    showToast('请输入搜索内容', 'warning');
    return;
  }

  saveSearchHistory(searchQuery.value.trim());
  showHistory.value = false;

  if (selectedEngine.value.name === 'site') {
    try {
      const res = await searchCards(searchQuery.value);
      searchResults.value = res.data;
      isSearching.value = true;
      if (searchResults.value.length === 0) {
        showToast('未找到相关内容', 'warning');
      }
    } catch (error) {
      console.error('搜索出错:', error);
      showToast('搜索出错：' + getErrorMessage(error), 'error');
    }
  } else {
    const url = selectedEngine.value.url(searchQuery.value);
    window.open(url, '_blank');
  }
}
</script>

<style scoped>
.menu-bar-fixed {
  position: fixed;
  top: .6rem;
  left: 0;
  width: 100vw;
  z-index: 100;
}

.search-engine-select {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: .3rem;
  gap: 5px;
  z-index: 2;
}
.engine-btn {
  border: none;
  background: none;
  color: #ffffff;
  font-size: .8rem ;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}
.engine-btn.active, .engine-btn:hover {
  color: #399dff;
  background: #ffffff1a;
}

.search-container {
  display: flex;
  align-items: center;
  background: #b3b7b83b;
  border-radius: 20px;
  padding: 0.3rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  max-width: 480px;
  width: 92%;
  position: relative;
}

.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
}

.clear-history-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  color: #374151;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f3f4f6;
}

.history-item span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-history-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.remove-history-btn:hover {
  color: #ef4444;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: .1rem .5rem;
  font-size: 1.2rem;
  color: #ffffff;
  outline: none;
}

.search-input::placeholder {
  color: #999;
}

.clear-btn {
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  margin-right: 0.2rem;
  display: flex;
  align-items: center;
  padding: 0;
}

.search-btn {
  background: #e9e9eb00;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  margin-right: 0.1rem;
}

.search-btn:hover {
  background: #3367d6;
}

.home-container {
  min-height: 95vh;
  background-image: url('/background.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-top: 50px;
}

.home-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.search-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.8rem 0;
  position: relative;
  z-index: 2;
}

.search-box-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
}

/* 子菜单横向滑动区域 */
.sub-menu-section {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 55rem;
  margin: 0 auto;
  padding: 0 1rem;
}

.sub-menu-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 8px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sub-menu-scroll::-webkit-scrollbar {
  display: none;
}

.sub-menu-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);
}

.sub-menu-btn:hover {
  background: rgba(57, 157, 255, 0.3);
  border-color: rgba(57, 157, 255, 0.5);
}

.sub-menu-btn.active {
  background: rgba(57, 157, 255, 0.5);
  border-color: #399dff;
  color: #fff;
}

.sub-menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  margin: 8px 0 16px;
}

.search-result-tip {
  text-align: center;
  color: #fff;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.exit-search-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.exit-search-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 卡片区域包装器 */
.card-wrapper {
  position: relative;
  z-index: 2;
  min-height: 200px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 骨架屏样式 */
.skeleton-grid {
  max-width: 55rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 15px;
  padding: 0 1rem;
}

@media (max-width: 1200px) {
  .skeleton-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 768px) {
  .skeleton-grid { grid-template-columns: repeat(3, 1fr); }
}

.skeleton-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 85px;
}

.skeleton-icon {
  width: 25px;
  height: 25px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-text {
  width: 60%;
  height: 14px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.2s;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* 内联加载指示器 */
.inline-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.inline-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #399dff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  padding: 40px;
  font-size: 16px;
}

.footer {
  margin-top: auto;
  text-align: center;
  padding: 1.5rem 1rem 2rem;
  position: relative;
  z-index: 2;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.friend-link-btn,
.admin-link-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  padding: 6px 12px;
  text-decoration: none;
  border-radius: 6px;
}

.friend-link-btn:hover,
.admin-link-btn:hover {
  color: #60a5fa;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: #8585859c;
  border-radius: 16px;
  width: 55rem;
  height: 30rem;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #d3d6d8;
}

.modal-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #cf1313;
}

.modal-body {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.friend-links-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
@media (max-width: 768px) {
  .friend-links-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .container {
    width: 95%;
  }
}

.friend-link-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: #cfd3d661;
  border-radius: 15px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  border: 1px solid #cfd3d661;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.friend-link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  background: #ffffff8e;
}

.friend-link-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.friend-link-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.friend-link-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
}

.friend-link-info h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.copyright {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.footer-link {
  color: #ffffffcc;
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover {
  color: #1976d2;
}

:deep(.menu-bar) {
  position: relative;
  z-index: 2;
}

:deep(.card-grid) {
  position: relative;
  z-index: 2;
}

.ad-space-fixed {
  position: fixed;
  top: 13rem;
  z-index: 10;
  width: 90px;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  background: transparent;
  margin: 0;
}
.left-ad-fixed {
  left: 0;
}
.right-ad-fixed {
  right: 0;
}
.ad-space-fixed a {
  width: 100%;
  display: block;
}
.ad-space-fixed img {
  width: 100%;
  max-width: 90px;
  max-height: 160px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  background: #fff;
  margin: 0 auto;
}

@media (max-width: 1200px) {
  .ad-space-fixed {
     /* display: none; */
  }
}

@media (max-width: 768px) {
  .home-container {
    padding-top: 80px;
  }

  .ad-space-fixed {
    display: none;
  }

  .footer {
    padding: 1rem 0.5rem 1.5rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 8px;
  }

  .footer-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .friend-link-btn,
  .admin-link-btn {
    font-size: 12px;
    padding: 4px 8px;
    gap: 4px;
  }

  .friend-link-btn svg,
  .admin-link-btn svg {
    width: 14px;
    height: 14px;
  }

  .copyright {
    color: rgba(255, 255, 255, 0.75);
    font-size: 11px;
    margin: 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}
</style>
