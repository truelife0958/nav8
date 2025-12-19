const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'web', 'dist', 'index.html');

if (!fs.existsSync(distIndex)) {
  // 以清晰的错误提示代替 404/502
  // 说明需要先构建前端（源码部署）或使用 Docker 镜像（已包含构建产物）
  console.error('[startup] 未找到前端构建产物：web/dist/index.html');
  console.error('[startup] 源码部署请执行：cd web && npm install && npm run build');
  console.error('[startup] 或使用 Docker 部署（推荐生产环境）');
  process.exit(1);
}
