// 模擬環境變數
process.env.CHANNEL_SECRET = 'test-secret';
process.env.GROQ_API_KEY = 'test-key';

// 初始化模擬資料庫
const { MockDatabase } = require('./src/test-utils');
global.mockDB = new MockDatabase(); 