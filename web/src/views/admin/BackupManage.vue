<template>
  <div class="backup-manage">
    <h2>数据备份</h2>
    
    <div class="backup-section">
      <h3>导出数据</h3>
      <p>将所有菜单、卡片、广告和友链数据导出为JSON文件</p>
      <button @click="handleExport" :disabled="exporting" class="btn btn-primary">
        {{ exporting ? '导出中...' : '导出备份' }}
      </button>
    </div>

    <div class="backup-section">
      <h3>导入数据</h3>
      <p>从JSON备份文件恢复数据</p>
      <div class="import-options">
        <label class="checkbox-label">
          <input type="checkbox" v-model="overwrite" />
          覆盖现有数据（不勾选则追加）
        </label>
      </div>
      <input type="file" ref="fileInput" accept=".json" @change="handleFileSelect" style="display:none" />
      <button @click="$refs.fileInput.click()" :disabled="importing" class="btn btn-secondary">
        选择备份文件
      </button>
      <button v-if="selectedFile" @click="handleImport" :disabled="importing" class="btn btn-primary">
        {{ importing ? '导入中...' : '开始导入' }}
      </button>
      <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
    </div>

    <div v-if="message" :class="['message', messageType]">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { exportBackup, importBackup } from '../../api';

const exporting = ref(false);
const importing = ref(false);
const overwrite = ref(false);
const selectedFile = ref(null);
const message = ref('');
const messageType = ref('');

async function handleExport() {
  exporting.value = true;
  message.value = '';
  try {
    const res = await exportBackup();
    const blob = new Blob([JSON.stringify(JSON.parse(await res.data.text()), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nav8-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.value = '导出成功';
    messageType.value = 'success';
  } catch (err) {
    message.value = '导出失败: ' + (err.response?.data?.error || err.message);
    messageType.value = 'error';
  }
  exporting.value = false;
}

function handleFileSelect(e) {
  selectedFile.value = e.target.files[0] || null;
}

async function handleImport() {
  if (!selectedFile.value) return;
  importing.value = true;
  message.value = '';
  try {
    const text = await selectedFile.value.text();
    const backup = JSON.parse(text);
    const res = await importBackup(backup.data, overwrite.value);
    message.value = `导入成功: ${JSON.stringify(res.data.imported)}`;
    messageType.value = 'success';
    selectedFile.value = null;
  } catch (err) {
    message.value = '导入失败: ' + (err.response?.data?.error || err.message);
    messageType.value = 'error';
  }
  importing.value = false;
}
</script>

<style scoped>
.backup-manage { padding: 20px; }
.backup-section { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
.backup-section h3 { margin: 0 0 10px; }
.backup-section p { color: #666; margin-bottom: 15px; }
.btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
.btn-primary { background: #1976d2; color: white; }
.btn-secondary { background: #757575; color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.import-options { margin-bottom: 15px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.file-name { color: #666; margin-left: 10px; }
.message { margin-top: 20px; padding: 10px; border-radius: 4px; }
.message.success { background: #e8f5e9; color: #2e7d32; }
.message.error { background: #ffebee; color: #c62828; }
</style>
