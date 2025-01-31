export const CONFIG = {
    LINE_API_ENDPOINT: 'https://api.line.me/v2/bot',
    MAX_MESSAGE_LENGTH: 2000,
    DEFAULT_LANGUAGE: 'zh-TW',
    LIFF_ID: '2006832947-D4LqNXvV',
    BOT_ID: '您的主要 Bot 的 Basic ID',
    LINE_CHANNEL_SECRET: '' // 這個值將從 env.CHANNEL_SECRET 獲取
}; 

// 新增一個函數來更新配置
export function updateConfig(env: any) {
    CONFIG.LINE_CHANNEL_SECRET = env.CHANNEL_SECRET || '';
} 