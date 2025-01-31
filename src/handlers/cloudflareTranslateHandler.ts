import { Env } from '../types';

// API 回應的介面定義
interface CloudflareAPIResponse {
    result: {
        detectedLanguage?: string;
        translated_text?: string;
    };
    success: boolean;
    errors: any[];
}

// 語言代碼映射表
const LANGUAGE_MAP = {
    'en': 'en',
    'vi': 'vi',
    'zh-TW': 'zh',
    'zh-CN': 'zh',
    'ja': 'ja',
    'ko': 'ko',
    'th': 'th',
    'ru': 'ru',
    'ar': 'ar',
    'fr': 'fr',
    'de': 'de',
    'es': 'es',
    'it': 'it',
    'ms': 'ms',
    'id': 'id',
    'hi': 'hi',
    'pt': 'pt'
};

// 檢測文本語言
async function detectLanguage(text: string, env: Env): Promise<string | null> {
    try {
        const response = await fetch('https://api.cloudflare.com/client/v4/ai/run/@cf/meta/m2m100-1.2b', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CF_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                task: 'detect',
                target_lang: 'en'  // 添加必要的參數
            })
        });

        if (!response.ok) {
            throw new Error(`語言檢測請求失敗: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as CloudflareAPIResponse;
        return result.result.detectedLanguage || null;
    } catch (error) {
        console.error('語言檢測錯誤:', error);
        throw error;
    }
}

// 翻譯文本
async function translate(text: string, targetLang: string, env: Env): Promise<string> {
    try {
        console.log(`開始翻譯文本到 ${targetLang}`);
        
        // 確保目標語言代碼正確
        const mappedLang = LANGUAGE_MAP[targetLang] || targetLang;
        console.log(`使用映射後的語言代碼: ${mappedLang}`);

        const response = await env.AI.run('@cf/meta/m2m100-1.2b', {
            text: text,
            target_lang: mappedLang
        });

        if (!response || typeof response !== 'string') {
            console.error('翻譯回應格式不正確:', response);
            throw new Error('翻譯服務回應格式錯誤');
        }
        
        console.log(`翻譯完成: ${response}`);
        return response.trim();
    } catch (error) {
        console.error('翻譯錯誤:', error);
        return `[翻譯失敗] ${error.message}`;
    }
}

// 智能翻譯處理
export async function translateWithThreeLanguages(
    text: string,
    primaryLangA: string,
    primaryLangB: string,
    secondaryLangC: string | null,
    env: Env
): Promise<string[]> {
    try {
        console.log('開始三語言翻譯處理:', {
            text,
            primaryLangA,
            primaryLangB,
            secondaryLangC
        });

        const translations: string[] = [];
        
        // 翻譯成主要語言B
        try {
            const translationB = await translate(text, primaryLangB, env);
            translations.push(translationB);
        } catch (error) {
            console.error('翻譯到語言B失敗:', error);
            translations.push(`[翻譯到${primaryLangB}失敗]`);
        }
        
        // 如果有設定次要語言C，也翻譯成C
        if (secondaryLangC) {
            try {
                const translationC = await translate(text, secondaryLangC, env);
                translations.push(translationC);
            } catch (error) {
                console.error('翻譯到語言C失敗:', error);
                translations.push(`[翻譯到${secondaryLangC}失敗]`);
            }
        }

        console.log('翻譯完成:', translations);
        return translations;
    } catch (error) {
        console.error('翻譯過程中發生錯誤:', error);
        return [`[翻譯失敗] ${error.message}`];
    }
} 
