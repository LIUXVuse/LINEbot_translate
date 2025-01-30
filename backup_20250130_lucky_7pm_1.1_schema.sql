-- 用戶資料表
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    language_preference TEXT,
    translation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 翻譯記錄表
CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    source_text TEXT,
    translated_text TEXT,
    source_lang TEXT,
    target_lang TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 訊息記錄表
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 語言設定表
CREATE TABLE IF NOT EXISTS language_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_id TEXT NOT NULL,      -- 可以是 groupId, roomId 或 userId
    context_type TEXT NOT NULL,    -- 'group', 'room', 或 'user'
    primary_lang_a TEXT,           -- 主要語言A
    primary_lang_b TEXT,           -- 主要語言B
    secondary_lang_c TEXT,         -- 次要語言C
    is_translating BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(context_id, context_type)
);

-- 訂閱設定表
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    subscription_type TEXT NOT NULL,  -- 'free', 'basic', 'premium'
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id)
); 