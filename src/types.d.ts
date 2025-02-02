/// <reference types="@cloudflare/workers-types" />

import { D1Database } from '@cloudflare/workers-types';

// LINE Bot 相關型別定義
export interface LineEventSource {
    type: 'user' | 'group' | 'room';
    userId: string;
    groupId?: string;
    roomId?: string;
}

export interface LineMessageEvent {
    type: 'message';
    message: {
        type: 'text';
        text: string;
        id: string;
    };
    replyToken: string;
    source: LineEventSource;
    timestamp: number;
}

export interface LinePostbackEvent {
    type: 'postback';
    postback: {
        data: string;
    };
    replyToken: string;
    source: LineEventSource;
    timestamp: number;
}

export type LineEvent = LineMessageEvent | LinePostbackEvent;

// 環境變數型別定義
export interface Env {
    DB: D1Database;
    CHANNEL_SECRET: string;
    CHANNEL_ACCESS_TOKEN: string;
    DEEPSEEK_API_KEY: string;
} 