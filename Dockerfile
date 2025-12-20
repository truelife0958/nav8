FROM node:20-alpine3.20 AS frontend-builder

WORKDIR /app

COPY web/package*.json ./

RUN npm install

COPY web/ ./

RUN npm run build

# 生产环境
FROM node:20-alpine3.20 AS production

RUN apk add --no-cache \
    sqlite \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 创建目录并设置权限，确保 node 用户可以读写
RUN mkdir -p uploads database web/dist && \
    chown -R node:node /app

COPY package*.json ./

RUN npm install

COPY app.js config.js db.js ./
COPY routes/ ./routes/
COPY scripts/ ./scripts/
COPY utils/ ./utils/

COPY --from=frontend-builder /app/dist ./web/dist

ENV NODE_ENV=production

EXPOSE 3000/tcp

CMD ["npm", "start"] 