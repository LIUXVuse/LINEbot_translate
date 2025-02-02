import { describe, expect, test } from '@jest/globals';
import { handleMessage } from '../messageHandler';
import { LineMessageEvent, Env } from '../../types';

describe('handleMessage', () => {
    test('should handle text message correctly', async () => {
        const mockEvent: LineMessageEvent = {
            type: 'message',
            message: {
                type: 'text',
                text: 'Hello',
                id: '123'
            },
            replyToken: 'reply-token',
            source: {
                type: 'user',
                userId: 'user-id'
            }
        };

        const mockEnv: Env = {
            LINE_CHANNEL_SECRET: 'secret',
            LINE_CHANNEL_ACCESS_TOKEN: 'token',
            GROQ_API_KEY: 'key',
            DB: {} as D1Database,
            AI: {},
            CF_ACCOUNT_ID: '',
            CF_API_TOKEN: '',
            GEMINI_API_KEY: '',
            CLOUDFLARE_ACCOUNT_ID: '',
            CLOUDFLARE_API_TOKEN: ''
        };

        const result = await handleMessage(mockEvent, mockEnv);
        expect(Array.isArray(result)).toBe(true);
    });
}); 