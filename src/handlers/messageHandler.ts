import { LineMessageEvent, Env } from '../types';
import { translate, formatTranslationResults, detectLanguage, SupportedLanguageCode, isSupportedLanguage } from './groqTranslateHandler';
import { getLanguageSetting } from '../services/languageSettingService';
import { createLanguageSelectionFlex } from './lineHandler';
import { CONFIG } from '../config';
import { replyMessage, handleCommand } from './lineHandler';

export async function handleMessage(event: LineMessageEvent, env: Env): Promise<any[]> {
    try {
        const text = String(event.message?.text || '').trim();
        
        // 優先處理指令，使用 lineHandler 中的 handleCommand
        if (text.startsWith('/')) {
            console.log('檢測到指令，轉交給 handleCommand 處理:', text);
            return await handleCommand(event, env);
        }

        // 如果不是指令，再進行翻譯處理
        const contextId = event.source.groupId || event.source.userId || '';
        const contextType = event.source.type;
        
        const setting = await getLanguageSetting(env.DB, contextId, contextType);
        if (!setting || !setting.is_translating) {
            console.log('未啟用翻譯或尚未設定');
            return [];
        }

        // 強制轉換輸入為字串
        const rawText = String(event.message?.text || '');
        
        // 簡單過濾非文字訊息
        if (rawText.length === 0 || rawText === 'undefined') {
            return [{
                type: 'text',
                text: '請傳送文字訊息',
                emojis: []
            }];
        }
        
        // 防禦性翻譯處理
        const translations = await translateService(
            rawText,
            [
                setting?.primary_lang_a || 'en',
                setting?.primary_lang_b || 'zh-TW',
                ...(setting?.secondary_lang_c ? [setting.secondary_lang_c] : [])
            ],
            env
        );
        
        // 安全格式轉換
        return processTranslationResults(translations, rawText);
    } catch (error) {
        console.error('處理文字訊息失敗:', error);
        return [{
            type: 'text',
            text: '處理訊息時發生錯誤，請稍後再試。'
        }];
    }
}

// 修改翻譯服務呼叫方式
async function translateService(text: string, targetLanguages: string[], env: Env) {
    try {
        // 直接使用傳入的 targetLanguages，移除無效的 setting 參數
        return await translate(
            text,
            targetLanguages,
            env
        );
    } catch (error) {
        console.error('翻譯服務錯誤:', error);
        return [{
            targetLang: 'error',
            translatedText: '翻譯服務暫時不可用'
        }];
    }
}

function getLangName(langCode: string): string {
    const langMap: Record<SupportedLanguageCode, string> = {
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

    if (isSupportedLanguage(langCode)) {
        return langMap[langCode];
    }
    return langCode;
}

// 完全重構的防禦性處理
function ensureString(input: any): string {
    // 防禦所有可能的非字串情況
    if (input == null) return ''; // null/undefined
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.join(' ');
    
    try {
        return String(input);
    } catch {
        try {
            return JSON.stringify(input);
        } catch {
            return '';
        }
    }
}

// 修改翻譯結果處理
export function processTranslationResults(translations: any[], originalText: string) {
    const results = translations.map(t => {
        const text = ensureString(t.translatedText);
        const langCode = t.targetLang;
        const langName = getLangName(langCode);
        
        return {
            lang: langCode,
            text: text.slice(0, 500),
            langName
        };
    });

    return [
        {
            type: 'text',
            text: `📌 原始訊息：${originalText.slice(0, 200)}`
        },
        ...results.map(t => ({
            type: 'text',
            text: `🌐 ${t.langName}：\n${t.text}`
        }))
    ];
}

async function handleTextMessage(event: LineMessageEvent, env: Env) {
    try {
        const text = event.message.text;
        const targetLanguages = ['en']; // 預設翻譯成英文

        // 呼叫翻譯功能
        const translations = await translate(text, targetLanguages, env);

        // 回覆翻譯結果
        await replyMessage(event.replyToken, [
            { type: 'text', text: `原文：${text}` },
            { type: 'text', text: `翻譯 (英文)：${translations[0].translatedText}` }
        ], env);
    } catch (error) {
        console.error('處理文字訊息失敗:', error);
        await replyMessage(event.replyToken, [
            { type: 'text', text: '翻譯服務暫時不可用，請稍後再試' }
        ], env);
    }
} 