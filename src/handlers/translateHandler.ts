import { Env } from '../types';

interface TranslateResponse {
    data: {
        translations: Array<{
            translatedText: string;
            detectedSourceLanguage?: string;
        }>;
    };
}

export async function translateText(
    text: string,
    targetLang: string,
    sourceLang: string,
    env: Env
): Promise<string> {
    try {
        const apiKey = 'J-0bDZfuuhIkYM1jJGKN-jPgmeBBc_JDNpald_Uj'; // 使用提供的Cloudflare API密鑰
        const url = `https://api.cloudflare.com/client/v4/accounts/6d7de63d20c5cefe2c5f5e384bda5522/workers/deepseek/translate`;
        
        console.log(`準備翻譯文本: "${text}" 從 ${sourceLang} 到 ${targetLang}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                text: text,
                target_language: targetLang,
                source_language: sourceLang
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('翻譯請求失敗:', errorText);
            throw new Error(`翻譯請求失敗: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('翻譯結果:', result);

        if (!result.translations || result.translations.length === 0) {
            throw new Error('未收到有效的翻譯結果');
        }

        return result.translations[0].translatedText;
    } catch (error) {
        console.error('翻譯過程中發生錯誤:', error);
        throw error;
    }
}

export async function translateWithSecondary(
    text: string,
    primaryLang: string,
    secondaryLang: string | null,
    env: Env
): Promise<string[]> {
    const translations: string[] = [];
    
    try {
        // 翻譯成主要語言
        const primaryTranslation = await translateText(text, primaryLang, primaryLang, env);
        translations.push(primaryTranslation);
        
        // 如果有次要語言，也進行翻譯
        if (secondaryLang) {
            const secondaryTranslation = await translateText(text, secondaryLang, primaryLang, env);
            translations.push(secondaryTranslation);
        }
        
        return translations;
    } catch (error) {
        console.error('翻譯過程中發生錯誤:', error);
        throw error;
    }
} 