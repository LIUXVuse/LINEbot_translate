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

// 新增翻譯結果驗證函數
function validateTranslationResult(text: string, targetLang: string): boolean {
    // 檢查是否為空
    if (!text || typeof text !== 'string') return false;

    // 根據目標語言檢查文字系統
    switch (targetLang) {
        case 'zh-TW':
        case 'zh-CN':
            // 檢查是否包含中文字符
            return /[\u4e00-\u9fa5]/.test(text) && 
                   // 確保不包含泰文字符
                   !/[\u0E00-\u0E7F]/.test(text);
        case 'th':
            // 檢查是否包含泰文字符
            return /[\u0E00-\u0E7F]/.test(text) &&
                   // 確保不包含中文字符
                   !/[\u4e00-\u9fa5]/.test(text);
        case 'en':
            // 檢查是否只包含英文和基本標點
            return /^[a-zA-Z0-9\s.,!?'"-]+$/.test(text);
        default:
            return true;
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
                            content: `你是一個翻譯引擎，只負責將輸入文字翻譯成${LANGUAGE_MAP[targetLang]}。

重要規則：
1. 禁止輸出任何解釋、註釋或額外內容
2. 禁止在回應中提及你是 AI 或機器學習模型
3. 禁止描述翻譯過程或翻譯結果
4. 禁止重複原文或加入原文對照
5. 禁止加入任何標點符號說明
6. 禁止加入任何換行或空白行

文字系統規則：
- 翻譯成中文時：只能使用中文漢字，不能混用其他文字
- 翻譯成泰文時：只能使用泰文字母，不能混用其他文字
- 翻譯成英文時：只能使用英文字母，不能混用其他文字

你的唯一任務就是輸出翻譯後的文字，不要做任何其他事情。`
                        },
                        {
                            role: "user",
                            content: `將這段文字翻譯成${LANGUAGE_MAP[targetLang]}：${text}`
                        }
                    ],
                    temperature: 0,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`翻譯服務錯誤: ${response.status}`);
            }

            const result = await response.json() as GroqResponse;
            const translatedContent = result.choices?.[0]?.message?.content?.trim() || '';
            
            // 驗證翻譯結果
            if (!validateTranslationResult(translatedContent, targetLang)) {
                console.error('翻譯結果驗證失敗:', {
                    targetLang,
                    translatedContent
                });
                continue;
            }

            // 移除所有註釋和額外內容
            const cleanedContent = translatedContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => {
                    // 過濾掉任何包含註釋標記的行
                    if (line.toLowerCase().includes('note:')) return false;
                    if (line.includes('(')) return false;
                    if (line.includes(')')) return false;
                    if (line.includes('translation:')) return false;
                    if (line.includes('翻譯:')) return false;
                    if (line.includes('翻译:')) return false;
                    return line.length > 0;
                })
                .join('');

            translations.push({
                targetLang,
                translatedText: cleanedContent
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