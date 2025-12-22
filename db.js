const bcrypt = require('./utils/bcrypt');
const config = require('./config');

// 检测数据库类型
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const usePostgres = !!connectionString;

class Database {
  constructor() {
    this.isPostgres = usePostgres;
    this.pool = null; // Postgres pool
    this.db = null; // Postgres pool OR SQLite db instance

    this.useExtendedProtocol = false;

    // sqlite driver: 'sqlite3' | 'sqljs'
    this.sqliteDriver = null;
    this.sqljsDbPath = null;
  }

  async init() {
    if (this.isPostgres) {
      await this.initPostgres();
    } else {
      await this.initSqlite();
    }
  }

  // --- PostgreSQL Implementation ---

  async initPostgres() {
    const { Pool } = require('pg');
    const useSSL = process.env.POSTGRES_SSL === 'true';
    // 兼容性设置
    const pgQueryModeEnv = (process.env.PG_QUERY_MODE || 'simple').toLowerCase();
    this.useExtendedProtocol = pgQueryModeEnv === 'extended';

    this.pool = new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : false
    });

    console.log(`PostgreSQL Mode: ${this.useExtendedProtocol ? 'Extended' : 'Simple (Inline Params)'}`);
    await this.initTables();
  }

  toPgLiteral(value) {
    if (value === undefined) throw new Error('Missing query parameter (undefined)');
    if (value === null) return 'NULL';
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error('Invalid number parameter');
      return String(value);
    }
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
    if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'`;
    if (typeof value === 'object') {
      const json = JSON.stringify(value);
      return `'${String(json).replace(/'/g, "''")}'::jsonb`;
    }
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  interpolatePgParams(sql, params = []) {
    return sql.replace(/\$(\d+)/g, (match, indexStr) => {
      const index = Number(indexStr) - 1;
      return this.toPgLiteral(params[index]);
    });
  }

  convertQuery(sql, params) {
    let pgSql = sql;
    let paramIndex = 0;
    const newParams = [];
    pgSql = pgSql.replace(/\?/g, () => {
      const param = params[paramIndex];
      paramIndex++;
      newParams.push(param);
      return `$${newParams.length}`;
    });
    return { sql: pgSql, params: newParams };
  }

  async queryPostgres(sql, params = []) {
    // 自动处理 INSERT RETURNING id
    const isInsert = /^\s*insert\s+into\s+/i.test(sql);
    const hasReturning = /\breturning\b/i.test(sql);
    let finalSql = sql;
    
    if (isInsert && !hasReturning) {
        finalSql += ' RETURNING id';
    }

    const converted = this.convertQuery(finalSql, params);
    
    let queryConfig;
    if (this.useExtendedProtocol) {
      queryConfig = { text: converted.sql, values: converted.params };
    } else {
      queryConfig = this.interpolatePgParams(converted.sql, converted.params);
    }

    try {
      const result = await this.pool.query(queryConfig);
      
      // 统一返回格式
      if (isInsert) {
        return { 
          lastID: result.rows[0]?.id || null, 
          changes: result.rowCount 
        };
      }
      // UPDATE / DELETE
      if (/^\s*(update|delete)\s+/i.test(sql)) {
          return { changes: result.rowCount };
      }
      
      // SELECT
      return result.rows;
    } catch (err) {
      console.error('SQL Error:', finalSql, params, err.message);
      throw err;
    }
  }

  // --- SQLite Implementation ---

  async initSqlite() {
    const path = require('path');
    const fs = require('fs');

    const dbDir = path.join(__dirname, 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'nav.db');

    // 优先使用原生 sqlite3（性能更好），若因 Node 版本导致 bindings 缺失，则回退到 sql.js（WASM）。
    try {
      const sqlite3 = require('sqlite3').verbose();

      return await new Promise((resolve, reject) => {
        this.sqliteDriver = 'sqlite3';
        this.db = new sqlite3.Database(dbPath, async (err) => {
          if (err) return reject(err);
          console.log('SQLite Connected');
          try {
            await this.initTables();
            resolve();
          } catch (initErr) {
            reject(initErr);
          }
        });
      });
    } catch (err) {
      console.warn('[db] sqlite3 加载失败，将回退到 sql.js:', err.message);
      await this.initSqlJs(dbPath);
    }
  }

  async initSqlJs(dbPath) {
    const fs = require('fs');

    const initSqlJs = require('sql.js');
    // sql.js 默认会从 CDN 加载 wasm 文件，在 Node.js 环境中可以不指定 locateFile
    // 如果需要离线使用，可以手动指定本地路径
    let SQL;
    try {
      SQL = await initSqlJs({
        locateFile: (file) => {
          try {
            return require.resolve(`sql.js/dist/${file}`);
          } catch {
            // 如果本地文件不存在，返回 CDN 地址
            return `https://sql.js.org/dist/${file}`;
          }
        }
      });
    } catch (err) {
      // 如果 locateFile 失败，尝试不带参数初始化
      console.warn('[db] sql.js locateFile 失败，尝试默认初始化:', err.message);
      SQL = await initSqlJs();
    }

    const buffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;

    this.sqliteDriver = 'sqljs';
    this.sqljsDbPath = dbPath;
    this.db = new SQL.Database(buffer || undefined);

    console.log('SQLite Connected (sql.js)');
    await this.initTables();
    this.persistSqlJs();
  }

  async querySqlite(method, sql, params = []) {
    if (this.sqliteDriver === 'sqljs') {
      return this.querySqlJs(method, sql, params);
    }

    return new Promise((resolve, reject) => {
      this.db[method](sql, params, function (err, rowOrRows) {
        if (err) {
          console.error('SQL Error:', sql, params, err.message);
          return reject(err);
        }

        // this 包含 run 方法的 lastID 和 changes
        if (method === 'run') {
          resolve({ lastID: this.lastID, changes: this.changes });
        } else {
          resolve(rowOrRows);
        }
      });
    });
  }

  persistSqlJs() {
    if (this.sqliteDriver !== 'sqljs' || !this.sqljsDbPath || !this.db) return;
    const fs = require('fs');
    const exported = this.db.export();
    fs.writeFileSync(this.sqljsDbPath, Buffer.from(exported));
  }

  querySqlJs(method, sql, params = []) {
    // sql.js 运行在内存中，需要手动持久化到文件
    try {
      if (method === 'run') {
        this.db.run(sql, params);
        const changes = this.db.getRowsModified();
        const lastIdRow = this.db.exec('SELECT last_insert_rowid() as id');
        const lastID = lastIdRow?.[0]?.values?.[0]?.[0] ?? null;
        this.persistSqlJs();
        return Promise.resolve({ lastID, changes });
      }

      const stmt = this.db.prepare(sql);
      try {
        stmt.bind(params);

        if (method === 'get') {
          if (!stmt.step()) return Promise.resolve(undefined);
          const row = stmt.getAsObject();
          return Promise.resolve(row);
        }

        // all
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        return Promise.resolve(rows);
      } finally {
        stmt.free();
      }
    } catch (err) {
      console.error('SQL Error:', sql, params, err.message);
      return Promise.reject(err);
    }
  }

  // --- Unified Interface ---

  /**
   * 执行查询并返回所有行 (SELECT)
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    if (this.isPostgres) return this.queryPostgres(sql, params);
    return this.querySqlite('all', sql, params);
  }

  // Alias for backward compatibility mental model (though new code should use query)
  async all(sql, params = []) {
      return this.query(sql, params);
  }

  /**
   * 执行查询并返回第一行 (SELECT LIMIT 1)
   * @returns {Promise<Object|undefined>}
   */
  async get(sql, params = []) {
    if (this.isPostgres) {
      const rows = await this.queryPostgres(sql, params);
      return rows[0];
    }
    return this.querySqlite('get', sql, params);
  }

  /**
   * 执行修改操作 (INSERT, UPDATE, DELETE)
   * @returns {Promise<{lastID: number, changes: number}>}
   */
  async run(sql, params = []) {
    if (this.isPostgres) return this.queryPostgres(sql, params);
    return this.querySqlite('run', sql, params);
  }

  // --- Initialization Logic ---

  async initTables() {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS menus (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        name TEXT NOT NULL,
        "order" INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS sub_menus (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        parent_id INTEGER NOT NULL ${this.isPostgres ? 'REFERENCES menus(id) ON DELETE CASCADE' : ''},
        name TEXT NOT NULL,
        "order" INTEGER DEFAULT 0
        ${!this.isPostgres ? ', FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE' : ''}
      )`,
      `CREATE TABLE IF NOT EXISTS cards (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        menu_id INTEGER ${this.isPostgres ? 'REFERENCES menus(id) ON DELETE CASCADE' : ''},
        sub_menu_id INTEGER ${this.isPostgres ? 'REFERENCES sub_menus(id) ON DELETE CASCADE' : ''},
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        logo_url TEXT,
        custom_logo_path TEXT,
        "desc" TEXT,
        "order" INTEGER DEFAULT 0
        ${!this.isPostgres ? ', FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE' : ''}
        ${!this.isPostgres ? ', FOREIGN KEY (sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE' : ''}
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        last_login_time TEXT,
        last_login_ip TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ads (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        position TEXT NOT NULL,
        img TEXT NOT NULL,
        url TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS friends (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        logo TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS visits (
        id ${this.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        date TEXT NOT NULL,
        pv INTEGER DEFAULT 0,
        uv INTEGER DEFAULT 0,
        UNIQUE(date)
      )`
    ];

    for (const sql of schemas) {
      await this.run(sql);
    }

    // 索引和约束
    await this.run(`DROP INDEX IF EXISTS uq_cards_menu_sub_url`);
    await this.run(`CREATE UNIQUE INDEX IF NOT EXISTS uq_cards_sub_url ON cards (COALESCE(sub_menu_id, -menu_id), url)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);

    // 检查并添加缺失列
    if (this.isPostgres) {
        const colCheck = await this.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name='users' AND column_name IN ('last_login_time', 'last_login_ip')
        `);
        const existingCols = colCheck.map(r => r.column_name);
        if (!existingCols.includes('last_login_time')) await this.run('ALTER TABLE users ADD COLUMN last_login_time TEXT');
        if (!existingCols.includes('last_login_ip')) await this.run('ALTER TABLE users ADD COLUMN last_login_ip TEXT');
    } else {
        const cols = await this.query("PRAGMA table_info(users)");
        const colNames = cols.map(c => c.name);
        if (!colNames.includes('last_login_time')) await this.run('ALTER TABLE users ADD COLUMN last_login_time TEXT');
        if (!colNames.includes('last_login_ip')) await this.run('ALTER TABLE users ADD COLUMN last_login_ip TEXT');
    }

    console.log(`${this.isPostgres ? 'PostgreSQL' : 'SQLite'} Tables Initialized`);
    await this.insertDefaultData();
  }

  async insertDefaultData() {
    const menuCount = await this.get('SELECT COUNT(*) as count FROM menus');
    const count = menuCount?.count || 0;
    
    if (Number(count) === 0) {
      console.log('Inserting default data...');
      const defaultMenus = [
        ['Home', 1], ['Ai Stuff', 2], ['Cloud', 3],
        ['Software', 4], ['Tools', 5], ['Other', 6]
      ];
      
      for (const [name, order] of defaultMenus) {
        await this.run('INSERT INTO menus (name, "order") VALUES (?, ?)', [name, order]);
      }

      // Default Cards
      const defaultCards = [
        [1, 'Google', 'https://www.google.com', 'https://www.google.com/favicon.ico', '搜索引擎', 1],
        [1, 'GitHub', 'https://github.com', 'https://github.com/favicon.ico', '代码托管平台', 2],
        [2, 'ChatGPT', 'https://chat.openai.com', 'https://chat.openai.com/favicon.ico', 'AI 对话助手', 1],
        [2, 'Claude', 'https://claude.ai', 'https://claude.ai/favicon.ico', 'Anthropic AI', 2]
      ];

      for (const [menuId, title, url, logo, desc, order] of defaultCards) {
        await this.run(
          'INSERT INTO cards (menu_id, title, url, logo_url, "desc", "order") VALUES (?, ?, ?, ?, ?, ?)',
          [menuId, title, url, logo, desc, order]
        );
      }
      console.log('Default data inserted.');
    }

    // Admin User
    // 注意：不要在每次启动时重置管理员密码，否则用户在后台修改密码会在重启后被覆盖。
    // 仅在首次创建管理员，或显式配置 ADMIN_PASSWORD 时才更新密码。
    const adminUser = await this.get('SELECT * FROM users WHERE username = ?', [config.admin.username]);
    const adminPasswordFromEnv = process.env.ADMIN_PASSWORD;

    if (!adminUser) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      await this.run('INSERT INTO users (username, password) VALUES (?, ?)', [config.admin.username, passwordHash]);
      console.log(`Admin user created: ${config.admin.username}`);
    } else if (typeof adminPasswordFromEnv === 'string' && adminPasswordFromEnv.length > 0) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      await this.run('UPDATE users SET password = ? WHERE username = ?', [passwordHash, config.admin.username]);
      console.log('Admin password updated from ADMIN_PASSWORD env.');
    }
  }
}

const dbInstance = new Database();
module.exports = dbInstance;
