<template>
  <div class="ad-manage">
    <h1 style="color: red; font-size: 24px; text-align: center; padding: 20px;">广告管理页面</h1>
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />

    <!-- 添加广告表单 -->
    <div class="ad-form-card">
      <h3 class="form-title">添加新广告</h3>
      <form class="ad-form" @submit.prevent="handleAddAd">
        <input v-model="newAdImg" placeholder="广告图片链接" class="input" />
        <input v-model="newAdUrl" placeholder="广告跳转链接" class="input" />
        <select v-model="newAdPos" class="input select-input">
          <option value="left">左侧广告</option>
          <option value="right">右侧广告</option>
        </select>
        <button class="btn btn-primary" type="submit">添加广告</button>
      </form>
    </div>

    <!-- 左侧广告列表 -->
    <div class="ad-section">
      <h3 class="section-title">左侧广告列表</h3>
      <div class="ad-card">
        <table class="ad-table">
          <thead><tr><th>图片链接</th><th>跳转链接</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="ad in leftAds" :key="ad.id">
              <td><input v-model="ad.img" @blur="updateAd(ad)" class="table-input" /></td>
              <td><input v-model="ad.url" @blur="updateAd(ad)" class="table-input" /></td>
              <td class="action-cell"><button class="btn btn-danger" @click="deleteAd(ad.id)">删除</button></td>
            </tr>
            <tr v-if="leftAds.length === 0">
              <td colspan="3" class="empty-cell">暂无左侧广告</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 右侧广告列表 -->
    <div class="ad-section">
      <h3 class="section-title">右侧广告列表</h3>
      <div class="ad-card">
        <table class="ad-table">
          <thead><tr><th>图片链接</th><th>跳转链接</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="ad in rightAds" :key="ad.id">
              <td><input v-model="ad.img" @blur="updateAd(ad)" class="table-input" /></td>
              <td><input v-model="ad.url" @blur="updateAd(ad)" class="table-input" /></td>
              <td class="action-cell"><button class="btn btn-danger" @click="deleteAd(ad.id)">删除</button></td>
            </tr>
            <tr v-if="rightAds.length === 0">
              <td colspan="3" class="empty-cell">暂无右侧广告</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAds, addAd as apiAddAd, updateAd as apiUpdateAd, deleteAd as apiDeleteAd, getErrorMessage } from '../../api';
import Toast from '../../components/Toast.vue';

const leftAds = ref([]);
const rightAds = ref([]);
const newAdImg = ref('');
const newAdUrl = ref('');
const newAdPos = ref('left');

const toast = ref({ show: false, message: '', type: 'info' });

function showToast(message, type = 'info') {
  toast.value = { show: true, message, type };
}

onMounted(loadAds);

async function loadAds() {
  try {
    const res = await getAds();
    const ads = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    leftAds.value = ads.filter(ad => ad.position === 'left');
    rightAds.value = ads.filter(ad => ad.position === 'right');
  } catch (error) {
    showToast('加载广告失败: ' + getErrorMessage(error), 'error');
    leftAds.value = [];
    rightAds.value = [];
  }
}

async function handleAddAd() {
  if (!newAdImg.value || !newAdUrl.value) {
    showToast('请填写广告图片链接和跳转链接', 'warning');
    return;
  }
  try {
    await apiAddAd({ position: newAdPos.value, img: newAdImg.value, url: newAdUrl.value });
    newAdImg.value = '';
    newAdUrl.value = '';
    newAdPos.value = 'left';
    showToast('添加广告成功', 'success');
    loadAds();
  } catch (error) {
    showToast('添加广告失败: ' + getErrorMessage(error), 'error');
  }
}

async function updateAd(ad) {
  try {
    await apiUpdateAd(ad.id, { position: ad.position, img: ad.img, url: ad.url });
    loadAds();
  } catch (error) {
    showToast('更新广告失败: ' + getErrorMessage(error), 'error');
  }
}

async function deleteAd(id) {
  if (!confirm('确定要删除这个广告吗？')) return;
  try {
    await apiDeleteAd(id);
    showToast('删除成功', 'success');
    loadAds();
  } catch (error) {
    showToast('删除广告失败: ' + getErrorMessage(error), 'error');
  }
}
</script>

<style scoped>
.ad-manage {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

.ad-form-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  color: white;
}

.form-title {
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
}

.ad-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.input {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  font-size: 14px;
  min-width: 180px;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.select-input {
  min-width: 120px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #fff;
  color: #667eea;
}

.btn-primary:hover {
  background: #f0f0f0;
}

.btn-danger {
  background: #e74c3c;
  color: #fff;
}

.btn-danger:hover {
  background: #c0392b;
}

.ad-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 3px solid #667eea;
}

.ad-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.ad-table {
  width: 100%;
  border-collapse: collapse;
}

.ad-table th,
.ad-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.ad-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.table-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.table-input:focus {
  outline: none;
  border-color: #667eea;
}

.action-cell {
  text-align: center;
  width: 100px;
}

.empty-cell {
  text-align: center;
  color: #999;
  padding: 24px !important;
}

@media (max-width: 768px) {
  .ad-manage {
    padding: 12px;
  }

  .ad-form {
    flex-direction: column;
  }

  .input {
    width: 100%;
    min-width: auto;
  }

  .btn {
    width: 100%;
  }

  .ad-table th,
  .ad-table td {
    padding: 8px;
    font-size: 13px;
  }
}
</style>
