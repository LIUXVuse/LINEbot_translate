import { Env } from '../types';

// API 回應的介面定義
interface CloudflareAIResponse {
    response?: string;
    result?: {
        language?: string;
        translated_text?: string;
    };
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// 語言代碼映射表
const LANGUAGE_MAP = {
    'en': 'English',
    'vi': 'Vietnamese',
    'zh': 'Chinese',
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

// 將用戶設定的語言代碼轉換為模型支援的格式
function convertLanguageCode(code: string): string {
    // 將 zh-TW 和 zh-CN 都轉換為 zh，但保留原始代碼用於比較
    if (code === 'zh-TW' || code === 'zh-CN') {
        return 'zh';
    }
    return code;
}

// 語言檢測
async function detectLanguage(text: string, env: Env): Promise<string> {
    try {
        const response = await env.AI.run("@cf/huggingface/microsoft/infoxlm-large-language-detection", {
            text
        }) as CloudflareAIResponse;
        
        console.log('語言檢測 API 完整回應:', JSON.stringify(response, null, 2));
        
        if (!response.result?.language) {
            console.log('語言檢測失敗，使用預設語言: en');
            return 'en';
        }
        
        const detectedLang = response.result.language;
        console.log('原始檢測到的語言:', detectedLang);
        return detectedLang;
    } catch (error) {
        console.error("語言檢測錯誤:", error);
        console.log('語言檢測發生錯誤，使用預設語言: en');
        return 'en';
    }
}

// 翻譯文本
async function translate(text: string, sourceLang: string, targetLang: string, env: Env): Promise<string> {
    try {
        // 轉換語言代碼
        const convertedSourceLang = convertLanguageCode(sourceLang);
        const convertedTargetLang = convertLanguageCode(targetLang);
        
        console.log('翻譯參數:', {
            原始文本: text,
            原始來源語言: sourceLang,
            轉換後來源語言: convertedSourceLang,
            原始目標語言: targetLang,
            轉換後目標語言: convertedTargetLang
        });
        
        // 如果源語言和目標語言完全相同（包括zh-TW和zh-CN的區別），直接返回原文
        if (sourceLang === targetLang) {
            console.log('來源語言和目標語言相同，直接返回原文');
            return text;
        }

        const messages = [
            { role: "system", content: `You are a professional translator. Translate the following text to ${LANGUAGE_MAP[targetLang] || targetLang}. Only return the translated text without any explanations or additional text.` },
            { role: "user", content: text }
        ];

        console.log('發送翻譯請求:', JSON.stringify(messages, null, 2));

        const response = await env.AI.run("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", {
            messages,
            temperature: 0.3,
            max_tokens: 1000,
            top_p: 0.9,
            top_k: 50
        }) as CloudflareAIResponse;

        console.log('翻譯 API 完整回應:', JSON.stringify(response, null, 2));

        if (!response?.response) {
            console.error('翻譯回應格式錯誤:', response);
            return `[翻譯錯誤] ${text}`;
        }

        const translatedText = response.response.trim();
        console.log('翻譯結果:', {
            原始文本: text,
            翻譯結果: translatedText,
            來源語言: sourceLang,
            目標語言: targetLang
        });

        return translatedText;
    } catch (error) {
        console.error("翻譯錯誤:", error);
        return `[翻譯錯誤] ${text}`;
    }
}

// 智能翻譯處理
export async function translateWithThreeLanguages(
    text: string,
    primaryLangA: string | null,
    primaryLangB: string | null,
    secondaryLangC: string | null,
    env: Env
): Promise<string[]> {
    try {
        console.log('開始多語言翻譯，參數:', {
            輸入文本: text,
            主要語言A: primaryLangA,
            主要語言B: primaryLangB,
            次要語言C: secondaryLangC
        });
        
        const translations: string[] = [];
        
        // 檢測源語言
        const sourceLang = await detectLanguage(text, env);
        console.log('語言檢測結果:', sourceLang);
        
        // 翻譯成主要語言A
        console.log('開始處理主要語言A翻譯');
        if (sourceLang === primaryLangA) {
            console.log('源語言與主要語言A相同，使用原文');
            translations.push(text);
        } else if (primaryLangA) {
            console.log('執行主要語言A翻譯');
            const translationA = await translate(text, sourceLang, primaryLangA, env);
            translations.push(translationA);
            console.log('完成主要語言A翻譯:', translationA);
        }

        // 翻譯成主要語言B
        console.log('開始處理主要語言B翻譯');
        if (sourceLang === primaryLangB) {
            console.log('源語言與主要語言B相同，使用原文');
            translations.push(text);
        } else if (primaryLangB) {
            console.log('執行主要語言B翻譯');
            const translationB = await translate(text, sourceLang, primaryLangB, env);
            translations.push(translationB);
            console.log('完成主要語言B翻譯:', translationB);
        }

        // 翻譯成次要語言C
        console.log('開始處理次要語言C翻譯');
        if (sourceLang === secondaryLangC) {
            console.log('源語言與次要語言C相同，使用原文');
            translations.push(text);
        } else if (secondaryLangC) {
            console.log('執行次要語言C翻譯');
            const translationC = await translate(text, sourceLang, secondaryLangC, env);
            translations.push(translationC);
            console.log('完成次要語言C翻譯:', translationC);
        }

        console.log('翻譯完成，結果:', {
            翻譯結果數量: translations.length,
            翻譯結果: translations
        });

        return translations;
    } catch (error) {
        console.error("翻譯過程中發生錯誤:", error);
        return [`[翻譯錯誤] ${text}`];
    }
} 
