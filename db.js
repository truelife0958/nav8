const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const config = require('./config');

// 从环境变量获取 PostgreSQL 连接字符串
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('错误: 请设置 DATABASE_URL 或 POSTGRES_URL 环境变量');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 包装器：使 PostgreSQL 接口兼容 SQLite 风格的回调
const db = {
  run: (sql, params, callback) => {
    // 将 SQLite 的 ? 占位符转换为 PostgreSQL 的 $1, $2...
    let pgSql = sql;
    let paramIndex = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
    
    pool.query(pgSql, params, (err, result) => {
      if (callback) {
        if (err) {
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
    let pgSql = sql;
    let paramIndex = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
    
    pool.query(pgSql, params, (err, result) => {
      if (callback) {
        callback(err, result?.rows[0] || null);
      }
    });
  },
  
  all: (sql, params, callback) => {
    let pgSql = sql;
    let paramIndex = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
    
    pool.query(pgSql, params, (err, result) => {
      if (callback) {
        callback(err, result?.rows || []);
      }
    });
  },
  
  serialize: (callback) => {
    callback();
  },
  
  prepare: (sql) => {
    // PostgreSQL 不需要 prepare，返回模拟对象
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

// 初始化数据库表
async function initDatabase() {
  try {
    // 创建表
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
    
    console.log('数据库表初始化完成');
    
    // 检查并插入默认数据
    await insertDefaultData();
    
  } catch (err) {
    console.error('数据库初始化失败:', err);
  }
}

async function insertDefaultData() {
  try {
    // 检查菜单是否为空
    const menuResult = await pool.query('SELECT COUNT(*) as count FROM menus');
    if (parseInt(menuResult.rows[0].count) === 0) {
      console.log('插入默认菜单...');
      const defaultMenus = [
        ['Home', 1],
        ['Ai Stuff', 2],
        ['Cloud', 3],
        ['Software', 4],
        ['Tools', 5],
        ['Other', 6]
      ];
      
      for (const [name, order] of defaultMenus) {
        await pool.query('INSERT INTO menus (name, "order") VALUES ($1, $2)', [name, order]);
      }
      console.log('默认菜单插入完成');
      
      // 插入默认子菜单和卡片
      await insertDefaultSubMenusAndCards();
    }
    
    // 插入或更新管理员账号
    const passwordHash = bcrypt.hashSync(config.admin.password, 10);
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [config.admin.username]);
    
    if (userResult.rows.length === 0) {
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [config.admin.username, passwordHash]);
      console.log('已创建管理员账号:', config.admin.username);
    } else {
      await pool.query('UPDATE users SET password = $1 WHERE username = $2', [passwordHash, config.admin.username]);
      console.log('已更新管理员密码');
    }
    
    // 检查友链是否为空
    const friendResult = await pool.query('SELECT COUNT(*) as count FROM friends');
    if (parseInt(friendResult.rows[0].count) === 0) {
      const defaultFriends = [
        ['Noodseek图床', 'https://www.nodeimage.com', 'https://www.nodeseek.com/static/image/favicon/favicon-32x32.png'],
        ['Font Awesome', 'https://fontawesome.com', 'https://fontawesome.com/favicon.ico']
      ];
      for (const [title, url, logo] of defaultFriends) {
        await pool.query('INSERT INTO friends (title, url, logo) VALUES ($1, $2, $3)', [title, url, logo]);
      }
      console.log('默认友链插入完成');
    }
    
  } catch (err) {
    console.error('插入默认数据失败:', err);
  }
}

async function insertDefaultSubMenusAndCards() {
  try {
    const menusResult = await pool.query('SELECT * FROM menus ORDER BY "order"');
    const menus = menusResult.rows;
    
    if (menus.length === 0) return;
    
    const menuMap = {};
    menus.forEach(m => { menuMap[m.name] = m.id; });
    
    // 插入子菜单
    const subMenus = [
      { parentMenu: 'Ai Stuff', name: 'AI chat', order: 1 },
      { parentMenu: 'Ai Stuff', name: 'AI tools', order: 2 },
      { parentMenu: 'Tools', name: 'Dev Tools', order: 1 },
      { parentMenu: 'Software', name: 'Mac', order: 1 },
      { parentMenu: 'Software', name: 'iOS', order: 2 },
      { parentMenu: 'Software', name: 'Android', order: 3 },
      { parentMenu: 'Software', name: 'Windows', order: 4 }
    ];
    
    const subMenuMap = {};
    for (const subMenu of subMenus) {
      if (menuMap[subMenu.parentMenu]) {
        const result = await pool.query(
          'INSERT INTO sub_menus (parent_id, name, "order") VALUES ($1, $2, $3) RETURNING id',
          [menuMap[subMenu.parentMenu], subMenu.name, subMenu.order]
        );
        subMenuMap[`${subMenu.parentMenu}_${subMenu.name}`] = result.rows[0].id;
        console.log(`成功插入子菜单 [${subMenu.parentMenu}] ${subMenu.name}`);
      }
    }
    
    // 插入卡片
    const cards = [
      { menu: 'Home', title: 'Baidu', url: 'https://www.baidu.com', logo_url: '', desc: '全球最大的中文搜索引擎' },
      { menu: 'Home', title: 'Youtube', url: 'https://www.youtube.com', logo_url: 'https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png', desc: '全球最大的视频社区' },
      { menu: 'Home', title: 'Gmail', url: 'https://mail.google.com', logo_url: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', desc: '' },
      { menu: 'Home', title: 'GitHub', url: 'https://github.com', logo_url: '', desc: '全球最大的代码托管平台' },
      { menu: 'Home', title: 'ChatGPT', url: 'https://chat.openai.com', logo_url: 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', desc: '人工智能AI聊天机器人' },
      { menu: 'Ai Stuff', title: 'ChatGPT', url: 'https://chat.openai.com', logo_url: 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', desc: 'OpenAI官方AI对话' },
      { menu: 'Ai Stuff', title: 'Deepseek', url: 'https://www.deepseek.com', logo_url: 'https://cdn.deepseek.com/chat/icon.png', desc: 'Deepseek AI搜索' },
      { menu: 'Ai Stuff', title: 'Claude', url: 'https://claude.ai', logo_url: 'https://img.icons8.com/fluency/240/claude-ai.png', desc: 'Anthropic Claude AI' },
      { menu: 'Cloud', title: '阿里云', url: 'https://www.aliyun.com', logo_url: 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico', desc: '阿里云官网' },
      { menu: 'Cloud', title: '腾讯云', url: 'https://cloud.tencent.com', logo_url: '', desc: '腾讯云官网' },
      { menu: 'Tools', title: 'JSON工具', url: 'https://www.json.cn', logo_url: 'https://img.icons8.com/nolan/128/json.png', desc: 'JSON格式化/校验' },
      { menu: 'Software', title: 'Hellowindows', url: 'https://hellowindows.cn', logo_url: 'https://hellowindows.cn/logo-s.png', desc: 'windows系统及office下载' },
      { menu: 'Other', title: 'Gmail', url: 'https://mail.google.com', logo_url: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', desc: 'Google邮箱' },
    ];
    
    for (const card of cards) {
      if (card.subMenu) {
        let subMenuId = null;
        for (const [key, id] of Object.entries(subMenuMap)) {
          if (key.endsWith(`_${card.subMenu}`)) {
            subMenuId = id;
            break;
          }
        }
        if (subMenuId) {
          await pool.query(
            'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, "desc") VALUES ($1, $2, $3, $4, $5, $6)',
            [null, subMenuId, card.title, card.url, card.logo_url, card.desc]
          );
        }
      } else if (menuMap[card.menu]) {
        await pool.query(
          'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, "desc") VALUES ($1, $2, $3, $4, $5, $6)',
          [menuMap[card.menu], null, card.title, card.url, card.logo_url, card.desc]
        );
        console.log(`成功插入卡片 [${card.menu}] ${card.title}`);
      }
    }
    
    console.log('默认卡片插入完成');
    
  } catch (err) {
    console.error('插入子菜单和卡片失败:', err);
  }
}

// 启动时初始化数据库
initDatabase();

module.exports = db;
