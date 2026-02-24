<template>
  <div class="friend-manage">
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />

    <div class="friend-header">
      <h2 class="page-title">友情链接管理</h2>
      <div class="friend-add">
        <input v-model="newTitle" placeholder="网站名" class="input" />
        <input v-model="newUrl" placeholder="网站链接" class="input" />
        <input v-model="newLogo" placeholder="logo链接(可选)" class="input" />
        <button class="btn btn-add" @click="addFriend">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          添加友链
        </button>
      </div>
    </div>

    <div class="friend-card">
      <table class="friend-table">
        <thead>
          <tr><th>网站名</th><th>链接</th><th>Logo</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in friends" :key="f.id">
            <td><input v-model="f.title" @blur="updateFriend(f)" class="table-input" /></td>
            <td><input v-model="f.url" @blur="updateFriend(f)" class="table-input" /></td>
            <td><input v-model="f.logo" @blur="updateFriend(f)" class="table-input" placeholder="logo链接(可选)" /></td>
            <td class="action-col">
              <button class="btn btn-danger btn-icon" @click="deleteFriend(f.id)" title="删除">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </td>
          </tr>
          <tr v-if="friends.length === 0">
            <td colspan="4" class="empty-cell">暂无友链数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getFriends, addFriend as apiAddFriend, updateFriend as apiUpdateFriend, deleteFriend as apiDeleteFriend, getErrorMessage } from '../../api';
import Toast from '../../components/Toast.vue';
import { useToast } from '../../composables/useToast';

const { toast, showToast } = useToast();
const friends = ref([]);
const newTitle = ref('');
const newUrl = ref('');
const newLogo = ref('');

onMounted(loadFriends);

async function loadFriends() {
  try {
    const res = await getFriends();
    friends.value = res.data;
  } catch (error) {
    showToast('加载友链失败: ' + getErrorMessage(error), 'error');
  }
}

async function addFriend() {
  if (!newTitle.value || !newUrl.value) {
    showToast('请填写网站名和链接', 'warning');
    return;
  }
  try {
    await apiAddFriend({ title: newTitle.value, url: newUrl.value, logo: newLogo.value });
    newTitle.value = '';
    newUrl.value = '';
    newLogo.value = '';
    showToast('添加友链成功', 'success');
    loadFriends();
  } catch (error) {
    showToast('添加友链失败: ' + getErrorMessage(error), 'error');
  }
}

async function updateFriend(f) {
  try {
    await apiUpdateFriend(f.id, { title: f.title, url: f.url, logo: f.logo });
    showToast('更新成功', 'success');
  } catch (error) {
    showToast('更新友链失败: ' + getErrorMessage(error), 'error');
    loadFriends();
  }
}

async function deleteFriend(id) {
  if (!confirm('确定要删除这个友链吗？')) return;
  try {
    await apiDeleteFriend(id);
    showToast('删除成功', 'success');
    loadFriends();
  } catch (error) {
    showToast('删除友链失败: ' + getErrorMessage(error), 'error');
  }
}
</script>

<style scoped>
.friend-manage {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.friend-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  width: 94%;
  text-align: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 15px 0;
}

.friend-add {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: #fff;
  color: #1f2937;
  font-size: 0.9rem;
  min-width: 160px;
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

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
  transition: all 0.2s;
}

.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
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
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  border-radius: 6px;
}

.friend-card {
  width: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.friend-table {
  width: 100%;
  border-collapse: collapse;
}

.friend-table th,
.friend-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.friend-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.table-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
  color: #1f2937;
  box-sizing: border-box;
  transition: all 0.2s;
}

.table-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.action-col {
  text-align: center;
  width: 80px;
}

.empty-cell {
  text-align: center;
  color: #9ca3af;
  padding: 32px !important;
}

@media (max-width: 768px) {
  .friend-manage {
    width: 93%;
  }

  .friend-add {
    flex-direction: column;
    align-items: stretch;
  }

  .input {
    min-width: 0;
    width: 100%;
  }

  .friend-table th,
  .friend-table td {
    padding: 8px;
    font-size: 0.85rem;
  }
}
</style>
