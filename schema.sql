-- 用戶資料表
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    language_preference TEXT,
    translation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 翻譯記錄表
CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    source_text TEXT,
    translated_text TEXT,
    source_lang TEXT,
    target_lang TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 