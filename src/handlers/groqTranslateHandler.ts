import { Env } from '../types';
import { MonitoringService } from '../services/monitoringService';

interface TranslationPair {
    targetLang: string;
    translatedText: string;
}

interface GroqResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

interface TranslationResult {
    targetLanguage: string;
    translatedText: string;
}

// 定義支援的語言代碼類型
export type SupportedLanguageCode = 
    | 'en' | 'vi' | 'zh-TW' | 'zh-CN' | 'ja' | 'ko' 
    | 'th' | 'ru' | 'ar' | 'fr' | 'de' | 'es' 
    | 'it' | 'ms' | 'id' | 'hi' | 'pt';

// 語言代碼映射表
const LANGUAGE_MAP: Record<SupportedLanguageCode, string> = {
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

// 檢查語言代碼是否支援
export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
    return code in LANGUAGE_MAP;
}

// 修改 getLangName 函數
export function getLangName(langCode: string): string {
    if (isSupportedLanguage(langCode)) {
        return LANGUAGE_MAP[langCode];
    }
    return langCode;
}

// 新增語言檢測函式
export async function detectLanguage(text: string): Promise<string> {
    try {
        if (/[\u4e00-\u9fa5]/.test(text)) {
            return 'zh-TW';
        } else if (/[a-zA-Z]/.test(text)) {
            return 'en';
        }
        return 'auto';
    } catch (error) {
        console.error('語言檢測失敗:', error);
        return 'auto';
    }
}

// 修改翻譯函數
export async function translate(
    text: string,
    targetLangs: string[],
    env: Env
): Promise<TranslationPair[]> {
    try {
        const translations: TranslationPair[] = [];
        
        for (const targetLang of targetLangs) {
            if (!targetLang || !isSupportedLanguage(targetLang)) {
                console.warn(`不支援的語言代碼: ${targetLang}`);
                continue;
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [
                        {
                            role: "system",
                            content: `You are a professional translator. Translate the following text to ${LANGUAGE_MAP[targetLang]}. Only return the translated text without any explanations, notes, or additional text.`
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`翻譯服務錯誤: ${response.status}`);
            }

            const result = await response.json() as GroqResponse;
            const translatedText = result.choices?.[0]?.message?.content?.trim() || '';

            translations.push({
                targetLang,
                translatedText
            });
        }

        return translations;
    } catch (error) {
        console.error('翻譯服務錯誤:', error);
        throw error instanceof Error ? error : new Error('翻譯服務暫時不可用');
    }
}

export function formatTranslationResults(
    originalText: string,
    translations: TranslationPair[]
): { type: string; text: string }[] {
    if (!originalText || typeof originalText !== 'string') {
        console.error('格式化翻譯結果時發生錯誤：原文不是有效的字串', { originalText });
        return [{ type: 'text', text: '翻譯錯誤：無效的原文格式' }];
    }

    if (!Array.isArray(translations)) {
        console.error('格式化翻譯結果時發生錯誤：翻譯結果不是陣列', { translations });
        return [{ type: 'text', text: '翻譯錯誤：無效的翻譯結果格式' }];
    }

    const results: { type: string; text: string }[] = [
        { type: 'text', text: `🌐 原文：\n${originalText}` }
    ];

    translations.forEach((translation) => {
        if (!translation || typeof translation !== 'object') {
            console.error('無效的翻譯項目', { translation });
            return;
        }
        const targetLang = translation.targetLang as SupportedLanguageCode;
        const translatedText = translation.translatedText as string;

        if (!targetLang || !translatedText || !(targetLang in LANGUAGE_MAP)) {
            console.error('翻譯項目缺少必要屬性', { translation });
            return;
        }

        results.push({
            type: 'text',
            text: `翻譯 (${LANGUAGE_MAP[targetLang]})：\n${translatedText}`
        });
    });

    // 如果沒有有效的翻譯結果，返回錯誤訊息
    if (results.length === 1) {
        return [{ type: 'text', text: '翻譯錯誤：未能生成有效的翻譯結果' }];
    }

    return results;
} 