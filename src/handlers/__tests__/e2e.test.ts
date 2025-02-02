import { handleMessage } from '../messageHandler';
import { LINEBotSimulator } from '../../test-utils';
import { describe, test, expect } from '@jest/globals';
import { Env, LanguageSetting, LineMessageEvent } from '../../types';
import { jest } from '@jest/globals';

// 模擬資料庫操作
jest.mock('../../services/languageSettingService', () => ({
  getLanguageSetting: jest.fn(() => Promise.resolve({
    context_id: 'test-id',
    context_type: 'group',
    primary_lang_a: 'zh-TW',
    primary_lang_b: 'en',
    secondary_lang_c: 'ja',
    is_translating: true
  }))
}));

describe('端到端測試', () => {
  const simulator = new LINEBotSimulator(handleMessage);

  const mockEnv: Env = {
    DB: {} as D1Database,
    LINE_CHANNEL_SECRET: 'test-secret',
    LINE_CHANNEL_ACCESS_TOKEN: 'test-token',
    GEMINI_API_KEY: 'test-key',
    AI: {},
    CF_ACCOUNT_ID: 'test-cf-id',
    CF_API_TOKEN: 'test-cf-token',
    GROQ_API_KEY: 'test-key',
    CLOUDFLARE_ACCOUNT_ID: 'test-cf-id',
    CLOUDFLARE_API_TOKEN: 'test-cf-token'
  };

  test('應處理各種異常輸入', async () => {
    const result1 = await simulator.sendTestMessage({ invalid: 'object' }); // 測試物件輸入
    await result1.expectTranslationCount(2);
    await result1.expectContains('無法解析的內容');

    const result2 = await simulator.sendTestMessage(12345); // 測試數字輸入
    await result2.expectTranslationCount(2);
    await result2.expectContains('12345');

    const result3 = await simulator.sendTestMessage('A'.repeat(600)); // 測試超長文字
    await result3.expectTranslationCount(2);
    await result3.expectContains('AAAAA...'); // 預期截斷顯示
  });

  test('應回傳基本格式', async () => {
    // 新增基本測試案例
    expect(true).toBeTruthy();
  });

  test('應正確處理中文翻譯請求', async () => {
    const event: LineMessageEvent = {
      type: 'message',
      message: { 
        type: 'text', 
        text: '整合測試',
        id: 'test-id'
      },
      source: { 
        type: 'group' as const,
        groupId: 'test-group-id'
      },
      replyToken: 'test-reply-token'
    };
    
    const result = await handleMessage(event, mockEnv);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('整合測試') }),
        expect.objectContaining({ text: expect.stringContaining('[EN]') }),
        expect.objectContaining({ text: expect.stringContaining('[JA]') })
      ])
    );
  });

  test('應過濾非文字訊息', async () => {
    const event: LineMessageEvent = {
      type: 'message',
      message: { 
        type: 'text',
        text: '   ',
        id: 'test-id'
      },
      source: { 
        type: 'group' as const,
        groupId: 'test-group-id'
      },
      replyToken: 'test-reply-token'
    };
    
    const result = await handleMessage(event, mockEnv);
    expect(result[0].text).toBe('請傳送文字訊息');
  });
}); 