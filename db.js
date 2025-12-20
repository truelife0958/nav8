const bcrypt = require('./utils/bcrypt');
const config = require('./config');

// 检测数据库类型
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const usePostgres = !!connectionString;

let db;

if (usePostgres) {
  // PostgreSQL 模式
  const { Pool } = require('pg');
  
  // SSL配置：只有明确设置 POSTGRES_SSL=true 时才启用SSL
  // Zeabur内部PostgreSQL不需要SSL
  const useSSL = process.env.POSTGRES_SSL === 'true';

  // 一些托管 Postgres / 连接池代理（如 PgBouncer 事务池、PgCat）会导致 prepared statement 异常。
  // 兼容性优先：默认改用“纯文本 SQL”（把参数安全转义后内联到 SQL）来避免协议级 prepared statement。
  // 如需恢复参数化（extended 协议），可设置 PG_QUERY_MODE=extended。
  const pgQueryModeEnv = (process.env.PG_QUERY_MODE || 'simple').toLowerCase();
  const useExtendedProtocol = pgQueryModeEnv === 'extended';

  const pool = new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  });

  console.log(`PostgreSQL 查询模式: ${useExtendedProtocol ? 'extended(参数化)' : 'text(内联参数)'}`);

  function toPgLiteral(value) {
    if (value === undefined) throw new Error('Missing query parameter (undefined)');
    if (value === null) return 'NULL';

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error('Invalid number parameter');
      return String(value);
    }

    if (typeof value === 'bigint') return value.toString();

    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

    if (value instanceof Date) {
      return `'${value.toISOString().replace(/'/g, "''")}'`;
    }

    if (Buffer.isBuffer(value)) {
      return `'\\x${value.toString('hex')}'`;
    }

    if (typeof value === 'object') {
      const json = JSON.stringify(value);
      return `'${String(json).replace(/'/g, "''")}'::jsonb`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
  }

  function interpolatePgParams(sql, params = []) {
    return sql.replace(/\$(\d+)/g, (match, indexStr) => {
      const index = Number(indexStr) - 1;
      return toPgLiteral(params[index]);
    });
  }

  function poolQuery(sql, params = []) {
    if (useExtendedProtocol) {
      return pool.query({ text: sql, values: params });
    }

    return pool.query(interpolatePgParams(sql, params));
  }
  
  // 转换 SQL 和参数
  function convertQuery(sql, params) {
    let pgSql = sql;
    let paramIndex = 0;
    const newParams = [];

    // 将 ? 占位符转换为 $1, $2...
    pgSql = pgSql.replace(/\?/g, () => {
      const param = params[paramIndex];
      paramIndex++;
      newParams.push(param);
      return `$${newParams.length}`;
    });

    return { sql: pgSql, params: newParams };
  }
  
  // PostgreSQL 包装器
  db = {
    isPostgres: true,
    run: (sql, params, callback) => {
      // 兼容 sqlite3 的 callback 语义：INSERT 时通过 this.lastID 返回自增 id
      // PostgreSQL 下如果原 SQL 没有 RETURNING，则自动追加 RETURNING id
      const shouldReturnId =
        typeof callback === 'function' &&
        /^\s*insert\s+into\s+/i.test(sql) &&
        !/\breturning\b/i.test(sql);

      const sqlWithReturning = shouldReturnId ? `${sql} RETURNING id` : sql;
      const converted = convertQuery(sqlWithReturning, params || []);

      const queryText = useExtendedProtocol
        ? null
        : interpolatePgParams(converted.sql, converted.params);

      const queryConfig = useExtendedProtocol
        ? { text: converted.sql, values: converted.params }
        : queryText;

      pool.query(queryConfig, (err, result) => {
        if (callback) {
          if (err) {
            console.error('SQL Error:', converted.sql, converted.params, err.message);
            callback.call({ lastID: null, changes: 0 }, err);
          } else {
            callback.call(
              {
                lastID: result?.rows?.[0]?.id ?? null,
                changes: result?.rowCount ?? 0
              },
              null
            );
          }
        }
      });
    },
    
    get: (sql, params, callback) => {
      const converted = convertQuery(sql, params || []);

      const queryText = useExtendedProtocol
        ? null
        : interpolatePgParams(converted.sql, converted.params);

      const queryConfig = useExtendedProtocol
        ? { text: converted.sql, values: converted.params }
        : queryText;

      pool.query(queryConfig, (err, result) => {
        if (callback) {
          if (err) {
            console.error('SQL Error:', converted.sql, converted.params, err.message);
          }
          callback(err, result?.rows[0] || null);
        }
      });
    },
    
    all: (sql, params, callback) => {
      const converted = convertQuery(sql, params || []);

      const queryText = useExtendedProtocol
        ? null
        : interpolatePgParams(converted.sql, converted.params);

      const queryConfig = useExtendedProtocol
        ? { text: converted.sql, values: converted.params }
        : queryText;

      pool.query(queryConfig, (err, result) => {
        if (callback) {
          if (err) {
            console.error('SQL Error:', converted.sql, converted.params, err.message);
          }
          callback(err, result?.rows || []);
        }
      });
    },
    
    serialize: (callback) => {
      callback();
    },
    
    prepare: (sql) => {
      return {
        run: (...args) => {
          const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          db.run(sql, args, callback);
        },
        finalize: (callback) => {
          if (callback) callback();
        }
      };
    }
  };
  
  // PostgreSQL 初始化
  async function initPostgres() {
    try {
      // 注意：不再自动删除表，避免数据丢失
      // 如需重建表结构，请手动执行 SQL 或使用备份恢复功能
      
      await poolQuery(`
        CREATE TABLE IF NOT EXISTS menus (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          "order" INTEGER DEFAULT 0
        )
      `);
      
      await poolQuery(`
        CREATE TABLE IF NOT EXISTS sub_menus (
          id SERIAL PRIMARY KEY,
          parent_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          "order" INTEGER DEFAULT 0
        )
      `);
      
      await poolQuery(`
        CREATE TABLE IF NOT EXISTS cards (
          id SERIAL PRIMARY KEY,
          menu_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
          sub_menu_id INTEGER REFERENCES sub_menus(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          logo_url TEXT,
          custom_logo_path TEXT,
          "desc" TEXT,
          "order" INTEGER DEFAULT 0
        )
      `);

      // 兜底去重：避免因前端重复提交/代理重试导致同一 url 多次导入
      // 注意：sub_menu_id 允许为 NULL，普通 UNIQUE(menu_id, sub_menu_id, url) 无法约束 NULL 重复
      // 所以使用表达式索引对 NULL 做 COALESCE
      await poolQuery(`
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY menu_id, COALESCE(sub_menu_id, 0), url
            ORDER BY id
          ) AS rn
          FROM cards
        )
        DELETE FROM cards
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      `);

      await poolQuery(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_cards_menu_sub_url
        ON cards (menu_id, COALESCE(sub_menu_id, 0), url)
      `);
      
      await poolQuery(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          last_login_time TEXT,
          last_login_ip TEXT
        )
      `);
      
      // 确保users表有last_login_time和last_login_ip列（兼容旧表）
      const colCheck = await poolQuery(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='users' AND column_name IN ('last_login_time', 'last_login_ip')
      `);
      const existingCols = colCheck.rows.map(r => r.column_name);
      
      if (!existingCols.includes('last_login_time')) {
        await poolQuery('ALTER TABLE users ADD COLUMN last_login_time TEXT');
        console.log('已添加 last_login_time 列');
      }
      if (!existingCols.includes('last_login_ip')) {
        await poolQuery('ALTER TABLE users ADD COLUMN last_login_ip TEXT');
        console.log('已添加 last_login_ip 列');
      }
      
      await poolQuery(`
        CREATE TABLE IF NOT EXISTS ads (
          id SERIAL PRIMARY KEY,
          position TEXT NOT NULL,
          img TEXT NOT NULL,
          url TEXT NOT NULL
        )
      `);
      
      await poolQuery(`
        CREATE TABLE IF NOT EXISTS friends (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          logo TEXT
        )
      `);
      
      // 创建索引
      await poolQuery(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);
      await poolQuery(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
      await poolQuery(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
      await poolQuery(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);
      
      console.log('PostgreSQL 数据库表初始化完成');
      
      await insertDefaultDataPg(pool);
      
    } catch (err) {
      console.error('PostgreSQL 初始化失败:', err);
    }
  }
  
  async function insertDefaultDataPg(pool) {
    try {
      const menuResult = await poolQuery('SELECT COUNT(*) as count FROM menus');
      if (parseInt(menuResult.rows[0].count) === 0) {
        console.log('插入默认菜单...');
        const defaultMenus = [
          ['Home', 1], ['Ai Stuff', 2], ['Cloud', 3],
          ['Software', 4], ['Tools', 5], ['Other', 6]
        ];
        
        for (const [name, order] of defaultMenus) {
          await poolQuery('INSERT INTO menus (name, "order") VALUES ($1, $2)', [name, order]);
        }
        console.log('默认菜单插入完成');
        
        // 插入示例卡片
        const defaultCards = [
          [1, 'Google', 'https://www.google.com', 'https://www.google.com/favicon.ico', '搜索引擎', 1],
          [1, 'GitHub', 'https://github.com', 'https://github.com/favicon.ico', '代码托管平台', 2],
          [2, 'ChatGPT', 'https://chat.openai.com', 'https://chat.openai.com/favicon.ico', 'AI 对话助手', 1],
          [2, 'Claude', 'https://claude.ai', 'https://claude.ai/favicon.ico', 'Anthropic AI', 2]
        ];
        
        for (const [menuId, title, url, logo, desc, order] of defaultCards) {
          await poolQuery(
            'INSERT INTO cards (menu_id, title, url, logo_url, "desc", "order") VALUES ($1, $2, $3, $4, $5, $6)',
            [menuId, title, url, logo, desc, order]
          );
        }
        console.log('示例卡片插入完成');
      }
      
      // 管理员账号
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      const userResult = await poolQuery('SELECT * FROM users WHERE username = $1', [config.admin.username]);
      
      if (userResult.rows.length === 0) {
        await poolQuery('INSERT INTO users (username, password) VALUES ($1, $2)', [config.admin.username, passwordHash]);
        console.log('已创建管理员账号:', config.admin.username);
      } else {
        await poolQuery('UPDATE users SET password = $1 WHERE username = $2', [passwordHash, config.admin.username]);
        console.log('已更新管理员密码');
      }
      
    } catch (err) {
      console.error('插入默认数据失败:', err);
    }
  }
  
  initPostgres();
  
} else {
  // SQLite 模式
  const sqlite3 = require('./utils/sqlite3')();
  const path = require('path');
  const fs = require('fs');
  
  const dbDir = path.join(__dirname, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = path.join(dbDir, 'nav.db');
  db = new sqlite3.Database(dbPath);
  db.isPostgres = false;
  
  // SQLite 初始化
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS sub_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER,
      sub_menu_id INTEGER,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      logo_url TEXT,
      custom_logo_path TEXT,
      "desc" TEXT,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
      FOREIGN KEY (sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE
    )`);

    // 兜底去重 + 唯一索引：避免书签导入重复
    db.run(`
      DELETE FROM cards
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM cards
        GROUP BY menu_id, IFNULL(sub_menu_id, 0), url
      )
    `);

    db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cards_menu_sub_url
      ON cards(menu_id, IFNULL(sub_menu_id, 0), url)
    `);
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      last_login_time TEXT,
      last_login_ip TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position TEXT NOT NULL,
      img TEXT NOT NULL,
      url TEXT NOT NULL
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      logo TEXT
    )`);
    
    // 创建索引
    db.run(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);
    
    console.log('SQLite 数据库表初始化完成');
    
    // 插入默认数据
    db.get('SELECT COUNT(*) as count FROM menus', [], (err, row) => {
      if (!err && row.count === 0) {
        console.log('插入默认菜单...');
        const defaultMenus = [
          ['Home', 1], ['Ai Stuff', 2], ['Cloud', 3],
          ['Software', 4], ['Tools', 5], ['Other', 6]
        ];
        const stmt = db.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)');
        defaultMenus.forEach(([name, order]) => stmt.run(name, order));
        stmt.finalize(() => {
          // 插入示例卡片
          const defaultCards = [
            [1, 'Google', 'https://www.google.com', 'https://www.google.com/favicon.ico', '搜索引擎', 1],
            [1, 'GitHub', 'https://github.com', 'https://github.com/favicon.ico', '代码托管平台', 2],
            [2, 'ChatGPT', 'https://chat.openai.com', 'https://chat.openai.com/favicon.ico', 'AI 对话助手', 1],
            [2, 'Claude', 'https://claude.ai', 'https://claude.ai/favicon.ico', 'Anthropic AI', 2]
          ];
          const cardStmt = db.prepare('INSERT INTO cards (menu_id, title, url, logo_url, "desc", "order") VALUES (?, ?, ?, ?, ?, ?)');
          defaultCards.forEach(card => cardStmt.run(...card));
          cardStmt.finalize();
          console.log('示例卡片插入完成');
        });
        console.log('默认菜单插入完成');
      }
    });
    
    // 管理员账号
    const passwordHash = bcrypt.hashSync(config.admin.password, 10);
    db.get('SELECT * FROM users WHERE username = ?', [config.admin.username], (err, user) => {
      if (!err) {
        if (!user) {
          db.run('INSERT INTO users (username, password) VALUES (?, ?)', [config.admin.username, passwordHash]);
          console.log('已创建管理员账号:', config.admin.username);
        } else {
          db.run('UPDATE users SET password = ? WHERE username = ?', [passwordHash, config.admin.username]);
          console.log('已更新管理员密码');
        }
      }
    });
  });
}

module.exports = db;
