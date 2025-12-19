function loadSqlite3() {
  try {
    // 优先使用 sqlite3（性能好，现有代码已适配）
    return require('sqlite3').verbose();
  } catch (err) {
    const nodeVersion = process.versions?.node || 'unknown';
    const message = [
      '无法加载 sqlite3 原生模块（通常是 Node 版本过新或缺少编译环境）。',
      `当前 Node.js: ${nodeVersion}`,
      '解决方案：',
      '1) 使用 Node.js LTS（建议 18/20/22）后重新 npm install',
      '2) 或使用 Docker 运行（推荐生产/部署）',
      '3) 或设置 DATABASE_URL/POSTGRES_URL 使用 PostgreSQL 模式（不需要 sqlite3）'
    ].join('\n');

    const wrapped = new Error(message);
    wrapped.cause = err;
    throw wrapped;
  }
}

module.exports = loadSqlite3;
