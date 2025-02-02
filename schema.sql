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

-- 已有的表格
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 刪除舊的語言設定表格
DROP TABLE IF EXISTS language_settings;

-- 新增語言設定表格
CREATE TABLE language_settings (
    context_id TEXT NOT NULL,
    context_type TEXT NOT NULL,
    primary_lang_a TEXT,
    primary_lang_b TEXT,
    secondary_lang_c TEXT,
    is_translating INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(context_id, context_type)
);

-- 新增訂閱設定表格（為未來的儲值系統做準備）
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    subscription_type TEXT NOT NULL,  -- 'free', 'basic', 'premium'
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id)
);

-- 翻譯記錄表
CREATE TABLE IF NOT EXISTS translation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_lang TEXT NOT NULL,
    target_langs TEXT NOT NULL,  -- JSON array of target languages
    char_count INTEGER NOT NULL,
    success INTEGER NOT NULL,    -- 1 for success, 0 for failure
    error TEXT,                  -- Error message if any
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_translation_logs_timestamp ON translation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_language_settings_context ON language_settings(context_id, context_type);

-- 新增錯誤日誌表
CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    input_text TEXT,
    target_languages TEXT
);

-- 新增 API 錯誤日誌表
CREATE TABLE IF NOT EXISTS api_error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    api_name TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    error_message TEXT NOT NULL,
    request_url TEXT NOT NULL,
    request_body TEXT NOT NULL
); 