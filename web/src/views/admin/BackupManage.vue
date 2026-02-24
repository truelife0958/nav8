<template>
  <div class="backup-manage">
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />

    <div class="backup-header">
      <h2 class="page-title">数据备份与恢复</h2>
    </div>

    <div class="backup-sections">
      <div class="backup-section">
        <div class="section-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </div>
        <h3>导出数据</h3>
        <p>将所有菜单、卡片、广告和友链数据导出为JSON文件</p>
        <button @click="handleExport" :disabled="exporting" class="btn btn-primary">
          {{ exporting ? '导出中...' : '导出备份' }}
        </button>
      </div>

      <div class="backup-section">
        <div class="section-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <h3>导入数据</h3>
        <p>从JSON备份文件恢复数据</p>
        <div class="import-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="overwrite" />
            覆盖现有数据（不勾选则追加）
          </label>
        </div>
        <div class="import-actions">
          <input type="file" ref="fileInput" accept=".json" @change="handleFileSelect" style="display:none" />
          <button @click="$refs.fileInput.click()" :disabled="importing" class="btn btn-secondary">
            选择备份文件
          </button>
          <button v-if="selectedFile" @click="handleImport" :disabled="importing" class="btn btn-primary">
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
          <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { exportBackup, importBackup } from '../../api';
import Toast from '../../components/Toast.vue';
import { useToast } from '../../composables/useToast';

const { toast, showToast } = useToast();
const exporting = ref(false);
const importing = ref(false);
const overwrite = ref(false);
const selectedFile = ref(null);

async function handleExport() {
  exporting.value = true;
  try {
    const res = await exportBackup();
    let jsonData;
    if (res.data instanceof Blob) {
      const text = await res.data.text();
      jsonData = JSON.parse(text);
    } else {
      jsonData = res.data;
    }
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nav8-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功', 'success');
  } catch (err) {
    showToast('导出失败: ' + (err.response?.data?.error || err.message), 'error');
  }
  exporting.value = false;
}

function handleFileSelect(e) {
  selectedFile.value = e.target.files[0] || null;
}

async function handleImport() {
  if (!selectedFile.value) return;
  importing.value = true;
  try {
    const text = await selectedFile.value.text();
    const backup = JSON.parse(text);
    const res = await importBackup(backup.data, overwrite.value);
    showToast(`导入成功: ${JSON.stringify(res.data.imported)}`, 'success');
    selectedFile.value = null;
  } catch (err) {
    showToast('导入失败: ' + (err.response?.data?.error || err.message), 'error');
  }
  importing.value = false;
}
</script>

<style scoped>
.backup-manage {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
}

.backup-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  color: white;
  text-align: center;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.backup-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.backup-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 16px;
}

.backup-section h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.backup-section p {
  color: #6b7280;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.import-options {
  margin-bottom: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #374151;
}

.import-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.file-name {
  color: #059669;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .backup-sections {
    grid-template-columns: 1fr;
  }

  .backup-section {
    padding: 20px;
  }
}
</style>
