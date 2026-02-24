<template>
  <div class="user-manage">
    <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />

    <div class="user-header">
      <h2 class="page-title">用户管理</h2>
    </div>

    <div class="user-card">
      <div class="password-section">
        <h3 class="section-title">修改密码</h3>
        <div class="password-form">
          <div class="form-group">
            <label>当前密码：</label>
            <input v-model="oldPassword" type="password" placeholder="请输入当前密码" class="input" />
          </div>
          <div class="form-group">
            <label>新密码：</label>
            <input v-model="newPassword" type="password" placeholder="请输入新密码" class="input" />
          </div>
          <div class="form-group">
            <label>确认新密码：</label>
            <input v-model="confirmPassword" type="password" placeholder="请再次输入新密码" class="input" />
          </div>
          <div class="form-actions">
            <button @click="handleChangePassword" class="btn" :disabled="loading">
              {{ loading ? '修改中...' : '修改密码' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getUserProfile, changePassword, getErrorMessage } from '../../api';
import Toast from '../../components/Toast.vue';
import { useToast } from '../../composables/useToast';

const { toast, showToast } = useToast();
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const userInfo = ref({});

onMounted(async () => {
  try {
    const response = await getUserProfile();
    userInfo.value = response.data;
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  }
});

async function handleChangePassword() {
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    showToast('请填写所有密码字段', 'error');
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    showToast('两次输入的新密码不一致', 'error');
    return;
  }

  if (newPassword.value.length < 6) {
    showToast('新密码长度至少6位', 'error');
    return;
  }

  loading.value = true;

  try {
    await changePassword(oldPassword.value, newPassword.value);
    showToast('密码修改成功，2秒后自动退出登录...', 'success');
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    setTimeout(() => {
      localStorage.removeItem('token');
      window.location.reload();
    }, 2000);
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.user-manage {
  max-width: 600px;
  width: 95%;
  margin: 0 auto;
}

.user-header {
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

.user-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

.section-title {
  text-align: center;
  font-size: 1.2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
}

.password-form {
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #1f2937;
  font-size: 1rem;
  box-sizing: border-box;
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  text-align: center;
  margin-top: 24px;
}

.btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 32px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .user-card {
    padding: 20px;
  }
  .password-form {
    max-width: 100%;
  }
  .btn {
    width: 100%;
  }
}
</style>
