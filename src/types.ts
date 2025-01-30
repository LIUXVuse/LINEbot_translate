/// <reference types="@cloudflare/workers-types" />

export interface Env {
    DB: D1Database;
    LINE_CHANNEL_SECRET: string;
    LINE_CHANNEL_ACCESS_TOKEN: string;
    GEMINI_API_KEY: string;
    AI: any; // Cloudflare AI binding
    CF_ACCOUNT_ID: string;  // Cloudflare 帳號 ID
    CF_API_TOKEN: string;   // Cloudflare API Token
}

export interface LineEvent {
    type: string;
    source: {
        type: 'user' | 'group' | 'room';
        userId?: string;
        groupId?: string;
        roomId?: string;
    };
}

export interface LineMessageEvent extends LineEvent {
    type: 'message';
    message: {
        type: string;
        text: string;
    };
    replyToken: string;
}

export interface LinePostbackEvent extends LineEvent {
    type: 'postback';
    postback: {
        data: string;
    };
    replyToken: string;
}

export interface LanguageSetting {
    context_id: string;
    context_type: 'user' | 'group' | 'room';
    primary_lang: string;
    secondary_lang?: string | null;
    is_translating: boolean;
}

// ... 其他型別定義 ... 
