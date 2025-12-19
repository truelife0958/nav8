const bcrypt = require('bcrypt');
const config = require('./config');

// 检测数据库类型
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const usePostgres = !!connectionString;

let db;

if (usePostgres) {
  // PostgreSQL 模式
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString,
    ssl: false  // Zeabur 内部网络不需要 SSL
  });
  
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
    run: (sql, params, callback) => {
      const converted = convertQuery(sql, params || []);
      
      pool.query(converted.sql, converted.params, (err, result) => {
        if (callback) {
          if (err) {
            console.error('SQL Error:', converted.sql, converted.params, err.message);
            callback.call({ lastID: null, changes: 0 }, err);
          } else {
            callback.call({
              lastID: result.rows[0]?.id || null,
              changes: result.rowCount
            }, null);
          }
        }
      });
    },
    
    get: (sql, params, callback) => {
      const converted = convertQuery(sql, params || []);
      
      pool.query(converted.sql, converted.params, (err, result) => {
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
      
      pool.query(converted.sql, converted.params, (err, result) => {
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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS menus (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          "order" INTEGER DEFAULT 0
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sub_menus (
          id SERIAL PRIMARY KEY,
          parent_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          "order" INTEGER DEFAULT 0
        )
      `);
      
      await pool.query(`
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
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          last_login_time TEXT,
          last_login_ip TEXT
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ads (
          id SERIAL PRIMARY KEY,
          position TEXT NOT NULL,
          img TEXT NOT NULL,
          url TEXT NOT NULL
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS friends (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          logo TEXT
        )
      `);
      
      // 创建索引
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);
      
      console.log('PostgreSQL 数据库表初始化完成');
      
      await insertDefaultDataPg(pool);
      
    } catch (err) {
      console.error('PostgreSQL 初始化失败:', err);
    }
  }
  
  async function insertDefaultDataPg(pool) {
    try {
      const menuResult = await pool.query('SELECT COUNT(*) as count FROM menus');
      if (parseInt(menuResult.rows[0].count) === 0) {
        console.log('插入默认菜单...');
        const defaultMenus = [
          ['Home', 1], ['Ai Stuff', 2], ['Cloud', 3],
          ['Software', 4], ['Tools', 5], ['Other', 6]
        ];
        
        for (const [name, order] of defaultMenus) {
          await pool.query('INSERT INTO menus (name, "order") VALUES ($1, $2)', [name, order]);
        }
        console.log('默认菜单插入完成');
      }
      
      // 管理员账号
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [config.admin.username]);
      
      if (userResult.rows.length === 0) {
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [config.admin.username, passwordHash]);
        console.log('已创建管理员账号:', config.admin.username);
      } else {
        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [passwordHash, config.admin.username]);
        console.log('已更新管理员密码');
      }
      
    } catch (err) {
      console.error('插入默认数据失败:', err);
    }
  }
  
  initPostgres();
  
} else {
  // SQLite 模式
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const fs = require('fs');
  
  const dbDir = path.join(__dirname, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = path.join(dbDir, 'nav.db');
  db = new sqlite3.Database(dbPath);
  
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
        stmt.finalize();
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
