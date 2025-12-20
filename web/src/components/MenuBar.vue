<template>
  <nav class="menu-bar">
    <div
      v-for="menu in menus"
      :key="menu.id"
      class="menu-item"
    >
      <button
        @click="$emit('select', menu)"
        :class="{active: menu.id === activeId}"
      >
        {{ menu.name }}
        <!-- 有子菜单时显示小箭头 -->
        <span v-if="menu.subMenus && menu.subMenus.length > 0" class="has-sub-indicator">▼</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
const props = defineProps({
  menus: Array,
  activeId: Number,
  activeSubMenuId: Number
});
</script>

<style scoped>
.menu-bar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 1rem;
  position: relative;
}

.menu-item {
  position: relative;
}

.menu-bar button {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  padding: 0.8rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: none;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 4px;
}

.menu-bar button::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: #399dff;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.menu-bar button:hover {
  color: #399dff;
  transform: translateY(-1px);
}

.menu-bar button.active {
  color: #399dff;
}

.menu-bar button.active::before {
  width: 60%;
}

.has-sub-indicator {
  font-size: 10px;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .menu-bar {
    gap: 0.2rem;
  }
  
  .menu-bar button {
    font-size: 14px;
    padding: .4rem .8rem;
  }
  
  .has-sub-indicator {
    font-size: 8px;
  }
}
</style>