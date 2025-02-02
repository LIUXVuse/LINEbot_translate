import { LineMessageEvent } from './types';

export class LINEBotSimulator {
  private lastResponse: any[] = [];
  private messageHandler: (event: LineMessageEvent, env: any) => Promise<any[]>;

  constructor(messageHandler: (event: LineMessageEvent, env: any) => Promise<any[]>) {
    this.messageHandler = messageHandler;
  }

  async sendTestMessage(text: string | number | object): Promise<LINEBotSimulator> {
    const event = this.createMockEvent(text);
    this.lastResponse = await this.messageHandler(event, {});
    return this;
  }

  expectTranslationCount(count: number): LINEBotSimulator {
    if (!Array.isArray(this.lastResponse)) {
      throw new Error('Response is not an array');
    }

    const translationCount = this.lastResponse.length - 1; // 扣除原文
    if (translationCount !== count) {
      throw new Error(`Expected ${count} translations but got ${translationCount}`);
    }

    return this;
  }

  expectContains(text: string): void {
    if (!Array.isArray(this.lastResponse)) {
      throw new Error('Response is not an array');
    }

    const found = this.lastResponse.some(msg => 
      typeof msg.text === 'string' && msg.text.includes(text)
    );

    if (!found) {
      throw new Error(`Expected response to contain "${text}"`);
    }
  }

  private createMockEvent(text: string | number | object): LineMessageEvent {
    const stringText = typeof text === 'string' ? text :
                      typeof text === 'number' ? String(text) :
                      JSON.stringify(text);

    return {
      type: 'message',
      message: {
        type: 'text',
        text: stringText,
        id: 'test-id'
      },
      source: {
        type: 'user',
        userId: 'test-user'
      },
      replyToken: 'test-token'
    };
  }

  // 新增格式驗證方法
  validateResponseFormat() {
    if (!Array.isArray(this.lastResponse)) {
      throw new Error('回應必須是陣列');
    }
    
    this.lastResponse.forEach(msg => {
      if (!msg.type || !msg.text) {
        throw new Error('訊息缺少必要欄位');
      }
      if (msg.type === 'text' && !msg.emojis) {
        throw new Error('文字訊息必須包含 emojis 陣列');
      }
    });
    
    return this;
  }
}

// 模擬資料庫
export class MockDatabase {
  private store = new Map();

  async get(key: string) {
    return this.store.get(key);
  }

  async put(key: string, value: any) {
    this.store.set(key, value);
  }
}

// 模擬 LINE 事件
export function createLineMessageEvent(text: string): LineMessageEvent {
  return {
    type: 'message',
    message: {
      type: 'text',
      text,
      id: 'test-message-id'
    },
    source: {
      type: 'group',
      groupId: 'test-group',
      userId: 'test-user'
    },
    replyToken: 'test-reply-token'
  };
} 