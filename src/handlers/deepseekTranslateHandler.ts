import { Env } from '../types';

interface TranslationResult {
    originalText: string;
    primaryLangB: string;
    secondaryLangC: string;
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

// 翻譯文本
export async function translate(
    text: string,
    primaryLangA: string,
    primaryLangB: string,
    secondaryLangC: string | null,
    env: Env
): Promise<string[]> {
    try {
        console.log('開始使用 DeepSeek 翻譯，參數:', {
            text,
            primaryLangA,
            primaryLangB,
            secondaryLangC
        });

        const stream = await env.AI.run('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', {
            stream: true,
            max_tokens: 512,
            messages: [
                {
                    role: 'system',
                    content: `你是一個專業的線上翻譯專家，客戶會透過API的方式與你互動。
你會收到類似下面的請求，每次的語言不一定是這樣：
text: '${text}',
primaryLangA: '${primaryLangA}',
primaryLangB: '${primaryLangB}',
secondaryLangC: '${secondaryLangC}'

**請直接幫我輸出翻譯以下格式，無需提供思考過程**
'原語A': '原文',
'主要語言B': 'B語言翻譯結果',
'次要語言C': 'C語言翻譯結果'`
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        });

        const response = new Response(stream, {
            headers: { 'content-type': 'text/event-stream' }
        });

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('無法獲取翻譯結果');
        }

        let result = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
        }

        // 解析翻譯結果
        const translations = parseTranslationResult(result);
        const results: string[] = [];

        // 根據檢測到的語言決定翻譯順序
        if (translations.primaryLangB) {
            results.push(translations.primaryLangB);
        }
        if (translations.secondaryLangC && secondaryLangC) {
            results.push(translations.secondaryLangC);
        }

        return results;
    } catch (error) {
        console.error('DeepSeek 翻譯錯誤:', error);
        throw error;
    }
}

// 解析翻譯結果
function parseTranslationResult(result: string): TranslationResult {
    try {
        // 移除多餘的字符和格式化
        const cleanResult = result
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        // 嘗試解析 JSON
        const parsed = JSON.parse(cleanResult);
        return {
            originalText: parsed['原語A'] || '',
            primaryLangB: parsed['主要語言B'] || '',
            secondaryLangC: parsed['次要語言C'] || ''
        };
    } catch (error) {
        console.error('解析翻譯結果時發生錯誤:', error);
        throw new Error('無法解析翻譯結果');
    }
} 