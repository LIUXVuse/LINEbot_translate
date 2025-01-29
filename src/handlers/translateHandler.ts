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
    sourceLang: string = 'auto',
    env: Env
): Promise<string> {
    try {
        const apiKey = 'AIzaSyDBXBx22_fDGVBnfRom_p-QIRHxAzsPz2Y';
        const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
        
        console.log(`準備翻譯文本: "${text}" 從 ${sourceLang} 到 ${targetLang}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                target: targetLang,
                source: sourceLang === 'auto' ? undefined : sourceLang,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('翻譯請求失敗:', errorText);
            throw new Error(`翻譯請求失敗: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as TranslateResponse;
        console.log('翻譯結果:', result);

        if (!result.data?.translations?.[0]) {
            throw new Error('未收到有效的翻譯結果');
        }

        return result.data.translations[0].translatedText;
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
        const primaryTranslation = await translateText(text, primaryLang, 'auto', env);
        translations.push(primaryTranslation);
        
        // 如果有次要語言，也進行翻譯
        if (secondaryLang) {
            const secondaryTranslation = await translateText(text, secondaryLang, 'auto', env);
            translations.push(secondaryTranslation);
        }
        
        return translations;
    } catch (error) {
        console.error('翻譯過程中發生錯誤:', error);
        throw error;
    }
} 