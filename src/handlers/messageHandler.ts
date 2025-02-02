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
        // 檢測輸入文字的語言
        const detectedLang = await detectLanguage(text);
        console.log('檢測到的語言:', detectedLang);

        // 根據檢測到的語言重新排序目標語言
        const reorderedTargets = reorderTargetLanguages(
            detectedLang,
            targetLanguages
        );
        console.log('重新排序後的目標語言:', reorderedTargets);

        // 呼叫翻譯服務
        return await translate(
            text,
            reorderedTargets,
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

// 新增目標語言重排序函數
function reorderTargetLanguages(detectedLang: string, targetLanguages: string[]): string[] {
    // 如果檢測到的語言不在目標語言列表中，保持原順序
    if (!targetLanguages.includes(detectedLang)) {
        return targetLanguages;
    }

    // 將檢測到的語言從目標列表中移除
    const filteredTargets = targetLanguages.filter(lang => lang !== detectedLang);
    
    // 如果沒有其他目標語言，返回原列表
    if (filteredTargets.length === 0) {
        return targetLanguages;
    }

    return filteredTargets;
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
    // 驗證輸入
    if (!originalText || typeof originalText !== 'string') {
        console.error('無效的原始文字:', originalText);
        return [{
            type: 'text',
            text: '❌ 翻譯錯誤：無效的輸入文字'
        }];
    }

    if (!Array.isArray(translations)) {
        console.error('無效的翻譯結果:', translations);
        return [{
            type: 'text',
            text: '❌ 翻譯錯誤：翻譯服務異常'
        }];
    }

    const messages = [{
        type: 'text',
        text: `📝 原文：\n${originalText.slice(0, 200)}`
    }];

    // 過濾並處理翻譯結果
    const validTranslations = translations.filter(t => {
        if (!t || typeof t !== 'object') return false;
        if (!t.targetLang || !t.translatedText) return false;
        if (typeof t.translatedText !== 'string') return false;
        // 確保翻譯結果與原文不同
        if (t.translatedText.trim() === originalText.trim()) return false;
        return true;
    });

    if (validTranslations.length === 0) {
        messages.push({
            type: 'text',
            text: '❌ 翻譯失敗：無法獲得有效的翻譯結果'
        });
        return messages;
    }

    // 添加有效的翻譯結果
    validTranslations.forEach(t => {
        const langName = getLangName(t.targetLang);
        messages.push({
            type: 'text',
            text: `🔄 ${langName}：\n${t.translatedText.trim()}`
        });
    });

    return messages;
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