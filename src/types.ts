/// <reference types="@cloudflare/workers-types" />

export interface Env {
    DB: D1Database;
    LINE_CHANNEL_SECRET: string;
    LINE_CHANNEL_ACCESS_TOKEN: string;
    GEMINI_API_KEY: string;
    AI: any; // Cloudflare AI binding
    CF_ACCOUNT_ID: string;  // Cloudflare 帳號 ID
    CF_API_TOKEN: string;   // Cloudflare API Token
    GROQ_API_KEY: string;
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_API_TOKEN: string;
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
    type: string;
    message: {
        type: string;
        text: string;
        id: string;
    };
    replyToken: string;
}

export interface LinePostbackEvent extends LineEvent {
    type: string;
    postback: {
        data: string;
    };
    replyToken: string;
}

export interface LanguageSetting {
    context_id: string;
    context_type: 'user' | 'group' | 'room';
    primary_lang_a: string;
    primary_lang_b: string;
    secondary_lang_c?: string;
    is_translating: boolean;
}

export interface TranslationPair {
    targetLang: string;
    translatedText: string;
}

export interface TranslationService {
    translate(text: string, targetLangs: string[], env: Env): Promise<TranslationPair[]>;
}

// ... 其他型別定義 ... 
