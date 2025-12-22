<template>
  <div class="stats-manage">
    <div class="stats-header">
      <h2 class="page-title">访问统计概览</h2>
    </div>
    
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-label">今日 PV</div>
          <div class="stat-value">{{ stats.today?.pv || 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-label">今日 UV</div>
          <div class="stat-value">{{ stats.today?.uv || 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-info">
          <div class="stat-label">总 PV</div>
          <div class="stat-value">{{ stats.total?.pv || 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-info">
          <div class="stat-label">卡片总数</div>
          <div class="stat-value">{{ stats.cardCount || 0 }}</div>
        </div>
      </div>
    </div>
    
    <div class="week-stats" v-if="stats.weekData?.length">
      <h3>最近7天访问趋势</h3>
      <table class="stats-table">
        <thead>
          <tr><th>日期</th><th>PV</th><th>UV</th></tr>
        </thead>
        <tbody>
          <tr v-for="day in stats.weekData" :key="day.date">
            <td>{{ day.date }}</td>
            <td>{{ day.pv }}</td>
            <td>{{ day.uv }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getStatsSummary } from '../../api';

const stats = ref({});

onMounted(async () => {
  try {
    const res = await getStatsSummary();
    stats.value = res.data;
  } catch (e) {
    console.error('获取统计失败:', e);
  }
});
</script>

<style scoped>
.stats-manage {
  max-width: 900px;
  width: 95%;
  margin: 0 auto;
}

.stats-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  color: white;
  text-align: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.stat-icon {
  font-size: 2rem;
}

.stat-label {
  color: #6b7280;
  font-size: 14px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2937;
}

.week-stats {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.week-stats h3 {
  margin: 0 0 16px;
  color: #374151;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th, .stats-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.stats-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>