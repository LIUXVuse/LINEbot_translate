export const CONFIG = {
    LINE_API_ENDPOINT: 'https://api.line.me/v2/bot',
    MAX_MESSAGE_LENGTH: 2000,
    DEFAULT_LANGUAGE: 'zh-TW',
    LIFF_ID: '2006832947-D4LqNXvV',
    BOT_ID: '您的主要 Bot 的 Basic ID',
    CHANNEL_SECRET: '', // 這個值將從環境變數獲取
    USE_DEEPSEEK: true, // 可切換翻譯引擎
    MAX_INPUT_LENGTH: 1000,
    MAX_OUTPUT_LENGTH: 2000,
    TRANSLATION_TIMEOUT: 5000, // 5秒超時
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1',
    DEEPSEEK_API_KEY: '' // 這個值將從環境變數獲取
}; 

// 更新配置函數
export function updateConfig(env: any) {
    CONFIG.CHANNEL_SECRET = env.LINE_CHANNEL_SECRET || '';
    CONFIG.DEEPSEEK_API_KEY = env.GROQ_API_KEY || '';
} 