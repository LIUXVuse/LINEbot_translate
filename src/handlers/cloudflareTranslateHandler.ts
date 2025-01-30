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
    'en': 'English',
    'vi': 'Vietnamese',
    'zh-TW': 'Traditional Chinese',
    'zh-CN': 'Simplified Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'th': 'Thai',
    'ru': 'Russian',
    'ar': 'Arabic',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'it': 'Italian',
    'ms': 'Malay',
    'id': 'Indonesian',
    'hi': 'Hindi',
    'pt': 'Portuguese'
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
        const response = await fetch('https://api.cloudflare.com/client/v4/ai/run/@cf/meta/m2m100-1.2b', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CF_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                target_lang: targetLang
            })
        });

        if (!response.ok) {
            throw new Error(`翻譯請求失敗: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as CloudflareAPIResponse;
        if (!result.result.translated_text) {
            throw new Error('未收到翻譯結果');
        }
        return result.result.translated_text;
    } catch (error) {
        console.error('翻譯錯誤:', error);
        throw error;
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
        const translations: string[] = [];
        const detectedLang = await detectLanguage(text, env);
        
        if (!detectedLang) {
            throw new Error('無法檢測文字語言');
        }

        // 根據檢測到的語言決定翻譯方向
        if (detectedLang === primaryLangA) {
            // 如果是主要語言A，翻譯成B
            const translationB = await translate(text, primaryLangB, env);
            translations.push(translationB);
            
            // 如果有設定次要語言C，也翻譯成C
            if (secondaryLangC) {
                const translationC = await translate(text, secondaryLangC, env);
                translations.push(translationC);
            }
        } else if (detectedLang === primaryLangB) {
            // 如果是主要語言B，翻譯成A
            const translationA = await translate(text, primaryLangA, env);
            translations.push(translationA);
            
            // 如果有設定次要語言C，也翻譯成C
            if (secondaryLangC) {
                const translationC = await translate(text, secondaryLangC, env);
                translations.push(translationC);
            }
        } else if (detectedLang === secondaryLangC) {
            // 如果是次要語言C，翻譯成A和B
            const translationA = await translate(text, primaryLangA, env);
            const translationB = await translate(text, primaryLangB, env);
            translations.push(translationA, translationB);
        } else {
            // 如果是其他語言，翻譯成A和B
            const translationA = await translate(text, primaryLangA, env);
            const translationB = await translate(text, primaryLangB, env);
            translations.push(translationA, translationB);
            
            // 如果有設定次要語言C，也翻譯成C
            if (secondaryLangC) {
                const translationC = await translate(text, secondaryLangC, env);
                translations.push(translationC);
            }
        }

        return translations;
    } catch (error) {
        console.error('翻譯過程中發生錯誤:', error);
        throw error;
    }
} 
