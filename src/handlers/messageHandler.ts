import { LineMessageEvent, Env } from '../types';
import { translateWithThreeLanguages } from './cloudflareTranslateHandler';
import { getLanguageSetting } from '../services/languageSettingService';
import { createLanguageSelectionFlex } from './lineHandler';

export async function handleMessage(event: LineMessageEvent, env: Env): Promise<any[]> {
    try {
        const text = event.message.text;
        console.log('收到訊息:', text);

        // 處理指令
        if (text.startsWith('/')) {
            const command = text.toLowerCase();
            switch (command) {
                case '/說明':
                case '/help':
                    return [{
                        type: 'text',
                        text: `📖 LINE翻譯機器人使用說明\n\n` +
                            `1️⃣ 基本指令：\n` +
                            `• /翻譯 - 開始設定翻譯語言\n` +
                            `• /設定 - 設定翻譯語言\n` +
                            `• /狀態 - 查看目前翻譯設定\n` +
                            `• /說明 - 顯示此說明\n\n` +
                            `2️⃣ 使用方式：\n` +
                            `• 設定完語言後，機器人會自動翻譯群組內的訊息\n` +
                            `• 需要設定兩個主要語言(A和B)用於雙向翻譯\n` +
                            `• 可以選擇設定第三語言(C)作為額外翻譯\n\n` +
                            `3️⃣ 翻譯規則：\n` +
                            `• 當使用語言A時：翻譯成B和C\n` +
                            `• 當使用語言B時：翻譯成A和C\n` +
                            `• 當使用語言C時：翻譯成A和B\n` +
                            `• 使用其他語言時：翻譯成A、B和C`
                    }];
                case '/翻譯':
                case '/translate':
                case '/設定':
                case '/settings':
                    return [{
                        type: 'flex',
                        altText: '選擇翻譯語言',
                        contents: createLanguageSelectionFlex().contents
                    }];
                case '/狀態':
                case '/status':
                    const contextId = event.source.groupId || event.source.roomId || event.source.userId;
                    const contextType = event.source.type;
                    
                    if (!contextId) {
                        throw new Error('無法獲取對話 ID');
                    }

                    const setting = await getLanguageSetting(env.DB, contextId, contextType);
                    if (setting) {
                        return [{
                            type: 'text',
                            text: `📊 當前翻譯設定：\n` +
                                  `主要語言A：${getLangName(setting.primary_lang_a)}\n` +
                                  `主要語言B：${getLangName(setting.primary_lang_b)}\n` +
                                  `次要語言C：${setting.secondary_lang_c ? getLangName(setting.secondary_lang_c) : '未設定'}\n` +
                                  `自動翻譯：${setting.is_translating ? '開啟 ✅' : '關閉 ❌'}`
                        }];
                    } else {
                        return [{
                            type: 'text',
                            text: '❗ 尚未設定翻譯語言，請使用 /翻譯 或 /設定 來設定語言。'
                        }];
                    }
            }
            return [];
        }

        // 處理一般訊息
        const contextId = event.source.groupId || event.source.roomId || event.source.userId;
        const contextType = event.source.type;
        
        if (!contextId) {
            throw new Error('無法獲取對話 ID');
        }

        const setting = await getLanguageSetting(env.DB, contextId, contextType);
        if (!setting || !setting.is_translating) {
            return [];
        }

        // 使用翻譯服務
        console.log('開始翻譯訊息:', { 
            text, 
            primaryLangA: setting.primary_lang_a,
            primaryLangB: setting.primary_lang_b,
            secondaryLangC: setting.secondary_lang_c 
        });

        const translations = await translateWithThreeLanguages(
            text,
            setting.primary_lang_a,
            setting.primary_lang_b,
            setting.secondary_lang_c || null,
            env
        );

        // 構建回應訊息
        const messages = [{
            type: 'text',
            text: `🌐 原文：\n${text}`
        }];

        if (translations && translations.length > 0) {
            const langNames = [
                setting.primary_lang_a,
                setting.primary_lang_b,
                setting.secondary_lang_c
            ].filter(Boolean);

            translations.forEach((translation, index) => {
                messages.push({
                    type: 'text',
                    text: `翻譯 (${getLangName(langNames[index])})：\n${translation}`
                });
            });
        }

        return messages;
    } catch (error) {
        console.error('處理訊息時發生錯誤:', error);
        return [{
            type: 'text',
            text: `翻譯發生錯誤：${error.message}`
        }];
    }
}

function getLangName(langCode: string): string {
    const langMap = {
        'en': '英文',
        'ja': '日文',
        'ko': '韓文',
        'vi': '越南文',
        'th': '泰文',
        'zh-TW': '繁體中文',
        'zh-CN': '簡體中文',
        'ru': '俄文',
        'ar': '阿拉伯文',
        'fr': '法文',
        'de': '德文',
        'es': '西班牙文',
        'it': '義大利文',
        'ms': '馬來文',
        'id': '印尼文',
        'hi': '印地文',
        'pt': '葡萄牙文'
    };
    return langMap[langCode] || langCode;
} 