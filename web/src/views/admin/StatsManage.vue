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

    <div class="stats-row">
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

      <div class="click-ranking" v-if="clickRanking.length">
        <h3>🔥 卡片点击排行 TOP {{ clickRanking.length }}</h3>
        <table class="stats-table">
          <thead>
            <tr><th>排名</th><th>卡片</th><th>点击次数</th></tr>
          </thead>
          <tbody>
            <tr v-for="(card, index) in clickRanking" :key="card.id">
              <td class="rank-cell">
                <span :class="['rank-badge', getRankClass(index)]">{{ index + 1 }}</span>
              </td>
              <td class="card-cell">
                <a :href="card.url" target="_blank" class="card-link">
                  <img :src="getCardLogo(card)" alt="" class="card-logo" @error="onLogoError">
                  <span>{{ card.title }}</span>
                </a>
              </td>
              <td class="clicks-cell">{{ card.clicks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getStatsSummary, getClickRanking } from '../../api';
import { getCardLogo, onLogoError as handleLogoError } from '../../utils/logo';

const stats = ref({});
const clickRanking = ref([]);

onMounted(async () => {
  try {
    const [statsRes, rankingRes] = await Promise.all([
      getStatsSummary(),
      getClickRanking(20)
    ]);
    stats.value = statsRes.data;
    clickRanking.value = rankingRes.data || [];
  } catch {
    // 静默处理错误
  }
});

function getRankClass(index) {
  if (index === 0) return 'rank-gold';
  if (index === 1) return 'rank-silver';
  if (index === 2) return 'rank-bronze';
  return '';
}

function onLogoError(e) {
  handleLogoError(e);
}
</script>

<style scoped>
.stats-manage {
  max-width: 1200px;
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

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.week-stats,
.click-ranking {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.week-stats h3,
.click-ranking h3 {
  margin: 0 0 16px;
  color: #374151;
  font-size: 1.1rem;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.stats-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.rank-cell {
  width: 60px;
  text-align: center;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  background: #e5e7eb;
  color: #6b7280;
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #7c5800;
}

.rank-silver {
  background: linear-gradient(135deg, #e8e8e8, #c0c0c0);
  color: #555;
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32, #b8723a);
  color: #fff;
}

.card-cell {
  max-width: 200px;
}

.card-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #374151;
  transition: color 0.2s;
}

.card-link:hover {
  color: #667eea;
}

.card-logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: contain;
}

.clicks-cell {
  font-weight: 600;
  color: #667eea;
}

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>