/// <reference types="@cloudflare/workers-types" />

interface Env {
    DB: D1Database;
    LINE_CHANNEL_SECRET: string;
    LINE_CHANNEL_ACCESS_TOKEN: string;
    DEEPSEEK_API_KEY: string;
}

interface LineMessage {
    type: string;
    text?: string;
}

interface LineEvent {
    type: string;
    message: LineMessage;
    replyToken: string;
    source: {
        type: string;
        userId: string;
        groupId?: string;
    };
} 