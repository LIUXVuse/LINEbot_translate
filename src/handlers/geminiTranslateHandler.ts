import { GoogleGenerativeAI } from "@google/generative-ai";
import { Env } from '../types';

interface TranslateResponse {
    text: string;
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

// 添加請求限制控制
const requestLimiter = {
    lastRequestTime: 0,
    minInterval: 500, // 最小請求間隔（毫秒）
    async waitForNext() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }
};

// 添加重試機制的輔助函數
async function retry<T>(
    fn: () => Promise<T>,
    retries: number = 2,
    delay: number = 1000,
    onRetry?: (attempt: number) => void
): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            await requestLimiter.waitForNext(); // 確保請求間隔
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < retries - 1) {
                const waitTime = delay * Math.pow(1.5, i); // 指數退避
                console.log(`重試翻譯，第 ${i + 1} 次失敗，等待 ${waitTime}ms 後重試`);
                if (onRetry) onRetry(i + 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    throw lastError;
}

// 添加超時處理的輔助函數
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 3000  // 縮短為 3 秒
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('請求超時')), timeoutMs);
    });
    return Promise.race([promise, timeout]);
}

export async function translateText(
    text: string,
    targetLang: string,
    sourceLang: string = 'auto',
    env: Env
): Promise<string> {
    try {
        console.log(`準備使用 Gemini 翻譯文本: "${text}" 從 ${sourceLang} 到 ${targetLang}`);
        
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro",
            generationConfig: {
                temperature: 0,  // 使用確定性輸出
                topP: 1,
                topK: 1,
                maxOutputTokens: 100,  // 進一步限制輸出
            }
        });

        // 獲取目標語言的完整名稱
        const targetLanguage = LANGUAGE_MAP[targetLang] || targetLang;

        const prompt = `Translate this text to ${targetLanguage}, keep emojis: ${text}`;  // 最簡化提示詞

        // 使用重試機制和超時處理
        const result = await retry(
            async () => {
                const response = await withTimeout(model.generateContent(prompt));
                if (!response.response.text()) {
                    throw new Error('翻譯結果為空');
                }
                return response;
            },
            2,
            1000,
            (attempt) => {
                console.log(`第 ${attempt} 次重試翻譯...`);
            }
        );

        const translation = result.response.text();
        console.log('Gemini 翻譯結果:', translation);
        
        return translation.trim();
        
    } catch (error) {
        console.error('Gemini 翻譯過程中發生錯誤:', error);
        
        // 根據錯誤類型返回特定訊息
        if (error.message?.includes('429')) {
            throw new Error('API 請求次數已達上限，請稍後再試');
        } else if (error.message?.includes('超時')) {
            throw new Error('翻譯請求超時');
        } else {
            throw new Error('翻譯服務暫時無法使用');
        }
    }
}

export async function translateWithSecondary(
    text: string,
    primaryLang: string,
    secondaryLang: string | null,
    env: Env
): Promise<string[]> {
    const translations: string[] = [];
    
    // 只翻譯主要語言
    try {
        const primaryTranslation = await translateText(text, primaryLang, 'auto', env);
        if (primaryTranslation) {
            translations.push(primaryTranslation);
            console.log(`主要語言 (${primaryLang}) 翻譯完成`);
            
            // 如果主要語言成功且有次要語言，立即返回主要語言結果
            if (secondaryLang) {
                // 異步處理次要語言翻譯，不等待結果
                translateText(text, secondaryLang, 'auto', env)
                    .then(secondaryTranslation => {
                        if (secondaryTranslation) {
                            console.log(`次要語言 (${secondaryLang}) 翻譯完成`);
                        }
                    })
                    .catch(error => {
                        console.error('次要語言翻譯失敗:', error);
                    });
            }
        }
        
        return translations;
    } catch (error) {
        console.error('翻譯過程中發生錯誤:', error);
        throw error;
    }
} 
