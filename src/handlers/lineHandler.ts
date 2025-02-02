import { CONFIG, updateConfig } from '../config';
import { Env, LineEvent, LineMessageEvent, LinePostbackEvent } from '../types';
import {
    saveLanguageSetting,
    getLanguageSetting,
    updatePrimaryLanguageA,
    updatePrimaryLanguageB,
    updateSecondaryLanguageC,
    toggleTranslation
} from './languageHandler';
import { detectLanguage } from '../services/languageDetection';
import { translate } from './groqTranslateHandler';
import type { LanguageSetting } from '../services/languageSettingService';

// 將 Set 移到函數外部作為模組級別的變數
const processedTokens = new Set<string>();

// 定義所有支援的語言
const ALL_LANGUAGES = [
    { code: 'en', name: '英文', label: '🇺🇸 英文 English' },
    { code: 'zh-TW', name: '繁體中文', label: '🇹🇼 繁體中文' },
    { code: 'zh-CN', name: '簡體中文', label: '🇨🇳 简体中文' },
    { code: 'ja', name: '日文', label: '🇯🇵 日文 日本語' },
    { code: 'ko', name: '韓文', label: '🇰🇷 韓文 한국어' },
    { code: 'vi', name: '越南文', label: '🇻🇳 越南文 Tiếng Việt' },
    { code: 'th', name: '泰文', label: '🇹🇭 泰文 ภาษาไทย' },
    { code: 'ru', name: '俄文', label: '🇷🇺 俄文 Русский' },
    { code: 'ar', name: '阿拉伯文', label: '🇸🇦 阿拉伯文 العربية' },
    { code: 'fr', name: '法文', label: '🇫🇷 法文 Français' },
    { code: 'de', name: '德文', label: '🇩🇪 德文 Deutsch' },
    { code: 'es', name: '西班牙文', label: '🇪🇸 西班牙文 Español' },
    { code: 'it', name: '義大利文', label: '🇮🇹 義大利文 Italiano' },
    { code: 'ms', name: '馬來文', label: '🇲🇾 馬來文 Bahasa Melayu' },
    { code: 'id', name: '印尼文', label: '🇮🇩 印尼文 Bahasa Indonesia' },
    { code: 'hi', name: '印地文', label: '🇮🇳 印地文 हिन्दी' },
    { code: 'pt', name: '葡萄牙文', label: '🇵🇹 葡萄牙文 Português' },
    // ... 可以繼續添加更多語言
];

// 確保只在一個地方定義 LanguageSetting 並正確匯入
const languageSetting: LanguageSetting = {
    context_id: '',
    context_type: 'user',
    primary_lang_a: '',
    primary_lang_b: '',
    secondary_lang_c: '',
    is_translating: false
};

// 確保使用正確的 Request 類型
async function verifySignature(request: Request<unknown, CfProperties<unknown>>, secret: string): Promise<boolean> {
    const signature = request.headers.get('x-line-signature');
    if (!signature) {
        console.error('缺少簽名');
        return false;
    }

    const body = await request.clone().text();
    console.log('收到的請求內容:', body);
    
    try {
        // 使用 Web Crypto API
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'HMAC',
                hash: { name: 'SHA-256' }
            },
            false,
            ['sign']
        );
        
        const bodyBuffer = encoder.encode(body);
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBuffer);
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
        
        return signature === signatureBase64;
    } catch (error) {
        console.error('驗證簽名時發生錯誤:', error);
        return false;
    }
}

// 生成語言選擇介面
export function createLanguageSelectionFlex() {
    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '請選擇翻譯語言',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#1DB446'
                },
                {
                    type: 'text',
                    text: '請選擇要設定的項目：',
                    size: 'md',
                    align: 'center',
                    margin: 'md'
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '設定主要語言A',
                        data: 'action=show_primary_lang_a',
                        displayText: '設定主要語言A'
                    },
                    style: 'primary',
                    color: '#1DB446',
                    margin: 'md'
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '設定主要語言B',
                        data: 'action=show_primary_lang_b',
                        displayText: '設定主要語言B'
                    },
                    style: 'primary',
                    color: '#1DB446',
                    margin: 'md'
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '設定次要語言C',
                        data: 'action=show_secondary_lang_c',
                        displayText: '設定次要語言C'
                    },
                    style: 'secondary',
                    color: '#666666',
                    margin: 'md'
                }
            ]
        }
    };
}

// 生成語言列表選擇介面
export function createLanguageListFlex(type: 'a' | 'b' | 'c') {
    const titles = {
        'a': '選擇主要語言A',
        'b': '選擇主要語言B',
        'c': '選擇次要語言C'
    };

    const descriptions = {
        'a': '選擇第一個主要語言，用於雙向翻譯',
        'b': '選擇第二個主要語言，用於雙向翻譯',
        'c': '選擇次要語言，訊息將同時翻譯成此語言'
    };

    const actions = {
        'a': 'set_primary_lang_a',
        'b': 'set_primary_lang_b',
        'c': 'set_secondary_lang_c'
    };

    const languages = [
        { code: 'en', label: '🇺🇸 英文 English' },
        { code: 'zh-TW', label: '🇹🇼 繁體中文' },
        { code: 'zh-CN', label: '🇨🇳 简体中文' },
        { code: 'ja', label: '🇯🇵 日文 日本語' },
        { code: 'ko', label: '🇰🇷 韓文 한국어' },
        { code: 'vi', label: '🇻🇳 越南文 Tiếng Việt' },
        { code: 'th', label: '🇹🇭 泰文 ภาษาไทย' },
        { code: 'ru', label: '🇷🇺 俄文 Русский' },
        { code: 'ar', label: '🇸🇦 阿拉伯文 العربية' },
        { code: 'fr', label: '🇫🇷 法文 Français' },
        { code: 'de', label: '🇩🇪 德文 Deutsch' },
        { code: 'es', label: '🇪🇸 西班牙文 Español' },
        { code: 'it', label: '🇮🇹 義大利文 Italiano' },
        { code: 'ms', label: '🇲🇾 馬來文 Bahasa Melayu' },
        { code: 'id', label: '🇮🇩 印尼文 Bahasa Indonesia' },
        { code: 'hi', label: '🇮🇳 印地文 हिन्दी' },
        { code: 'pt', label: '🇵🇹 葡萄牙文 Português' }
    ];

    return {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            contents: [{
                type: "text",
                text: `🌐 ${titles[type]}`,
                weight: "bold",
                size: "xl",
                align: "center",
                color: "#1DB446"
            }],
            backgroundColor: "#f5f5f5"
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: descriptions[type],
                    size: "sm",
                    color: "#888888",
                    wrap: true,
                    margin: "md"
                },
                {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: languages.map(lang => ({
                        type: "button",
                        action: {
                            type: "postback",
                            label: lang.label,
                            data: `action=${actions[type]}&lang=${lang.code}`,
                            displayText: `選擇 ${lang.label}`
                        },
                        style: "primary",
                        color: "#1DB446",
                        margin: "sm",
                        height: "sm"
                    }))
                }
            ]
        }
    };
}

// 處理文字訊息
export async function handleTextMessage(event: LineMessageEvent, env: Env) {
    // 檢查訊息類型
    if (event.message.type !== 'text') {
        console.log('非文字訊息，跳過處理');
        return;
    }

    const text = event.message.text;
    if (!text) {
        console.log('訊息內容為空，跳過處理');
        return;
    }

    const trimmedText = text.trim();
    const contextId = event.source.groupId || event.source.roomId || event.source.userId || '';
    const contextType = event.source.type;
    
    console.log('收到訊息:', trimmedText);
    console.log('上下文資訊:', { contextId, contextType });
    
    try {
        // 先處理指令
        if (trimmedText.startsWith('/')) {
            console.log('檢測到指令:', trimmedText);
            await handleCommand(event, env);
            return;
        }

        // 如果不是指令，則進行翻譯處理
        console.log('開始檢查翻譯設定');
        const setting = await getLanguageSetting(env.DB, contextId, contextType);
        console.log('獲取到的翻譯設定:', setting);
        
        if (!setting || !setting.is_translating) {
            console.log('未啟用翻譯或尚未設定');
            return;
        }

        // 翻譯邏輯
        console.log('開始翻譯訊息:', {
            text: trimmedText,
            primaryLangA: setting.primary_lang_a,
            primaryLangB: setting.primary_lang_b,
            secondaryLangC: setting.secondary_lang_c
        });

        console.log('呼叫翻譯 API');
        // 根據輸入語言決定翻譯目標
        const targetLanguages = [];
        if (setting.primary_lang_a) targetLanguages.push(setting.primary_lang_a);
        if (setting.primary_lang_b) targetLanguages.push(setting.primary_lang_b);
        if (setting.secondary_lang_c) targetLanguages.push(setting.secondary_lang_c);

        const translations = await translate(
            trimmedText,
            targetLanguages,
            env
        );
        console.log('翻譯結果:', translations);

        const responseMessages = [{
            type: 'text',
            text: `📝 原文：\n${trimmedText}`
        }];
        
        console.log('準備組裝回覆訊息');
        if (translations?.length) {
            translations.forEach((translation: { targetLang: string; translatedText: string }) => {
                if (translation?.translatedText) {
                    console.log(`添加翻譯結果:`, translation);
                    responseMessages.push({
                        type: 'text',
                        text: `🔄 ${getLangName(translation.targetLang)}：\n${translation.translatedText}`
                    });
                }
            });
        }

        console.log('開始發送翻譯結果');
        await replyMessage(event.replyToken, responseMessages, env);
        console.log('翻譯結果發送完成');
    } catch (error: unknown) {
        console.error('處理文字訊息時發生錯誤:', error);
        
        // 記錄到錯誤日誌
        try {
            console.log('記錄錯誤到資料庫');
            await env.DB.prepare(`
                INSERT INTO error_logs (
                    timestamp,
                    error_type,
                    error_message,
                    stack_trace,
                    input_text
                ) VALUES (?, ?, ?, ?, ?)
            `).bind(
                new Date().toISOString(),
                'TEXT_HANDLER',
                error instanceof Error ? error.message : 'Unknown error',
                error instanceof Error ? error.stack : '',
                trimmedText
            ).run();
        } catch (dbError) {
            console.error('記錄錯誤到資料庫失敗:', dbError);
        }

        // 發送錯誤訊息給用戶
        try {
            console.log('發送錯誤訊息給用戶');
            await replyMessage(event.replyToken, [{
                type: 'text',
                text: `❌ 處理訊息時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}`
            }], env);
        } catch (replyError) {
            console.error('發送錯誤訊息失敗:', replyError);
        }
    }
}

// 處理 postback 事件
export async function handlePostback(event: LinePostbackEvent, env: Env): Promise<void> {
    try {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get('action');
        const lang = params.get('lang');
        const contextId = event.source.groupId || event.source.roomId || event.source.userId || '';
        const contextType = event.source.type;
        
        // 初始化設定時包含 contextType
        let setting = await getLanguageSetting(env.DB, contextId, contextType);
        if (!setting) {
            setting = {
                context_id: contextId,
                context_type: contextType,
                primary_lang_a: '',
                primary_lang_b: '',
                secondary_lang_c: undefined,
                is_translating: true
            };
        }
        
        console.log('處理 postback 事件:', { action, lang, data: event.postback.data });

        switch (action) {
            case 'show_primary_lang_a':
                console.log('顯示主要語言A選擇清單');
                await replyMessage(event.replyToken, [{
                    type: 'flex',
                    altText: '選擇主要語言A',
                    contents: createLanguageListFlex('a')
                }], env);
                break;

            case 'show_primary_lang_b':
                console.log('顯示主要語言B選擇清單');
                await replyMessage(event.replyToken, [{
                    type: 'flex',
                    altText: '選擇主要語言B',
                    contents: createLanguageListFlex('b')
                }], env);
                break;

            case 'show_secondary_lang_c':
                console.log('顯示次要語言C選擇清單');
                await replyMessage(event.replyToken, [{
                    type: 'flex',
                    altText: '選擇次要語言C',
                    contents: createLanguageListFlex('c')
                }], env);
                break;

            case 'set_primary_lang_a':
                if (lang) {
                    try {
                        await updatePrimaryLanguageA(env.DB, contextId, lang);
                        console.log('更新主要語言A成功:', {
                            contextId,
                            primaryLangA: lang
                        });

                        // 設定完語言A後，直接顯示語言B的選擇清單
                        await replyMessage(event.replyToken, [{
                            type: 'flex',
                            altText: '選擇主要語言B',
                            contents: createLanguageListFlex('b')
                        }], env);
                    } catch (error) {
                        console.error('設定主要語言A時發生錯誤:', error);
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: `❌ 設定失敗：${error instanceof Error ? error.message : '未知錯誤'}`
                        }], env);
                    }
                }
                break;

            case 'set_primary_lang_b':
                if (lang) {
                    try {
                        await updatePrimaryLanguageB(env.DB, contextId, lang);
                        console.log('更新主要語言B成功:', {
                            contextId,
                            primaryLangB: lang
                        });

                        // 設定完語言B後，直接顯示語言C的選擇清單
                        await replyMessage(event.replyToken, [{
                            type: 'flex',
                            altText: '選擇次要語言C',
                            contents: createLanguageListFlex('c')
                        }], env);
                    } catch (error) {
                        console.error('設定主要語言B時發生錯誤:', error);
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: `❌ 設定失敗：${error instanceof Error ? error.message : '未知錯誤'}`
                        }], env);
                    }
                }
                break;

            case 'set_secondary_lang_c':
                if (lang) {
                    try {
                        await updateSecondaryLanguageC(env.DB, contextId, lang);
                        console.log('更新次要語言C成功:', {
                            contextId,
                            secondaryLangC: lang
                        });

                        // 取得最新設定
                        const finalSetting = await getLanguageSetting(env.DB, contextId, contextType);
                        if (!finalSetting) {
                            throw new Error('無法取得最新設定');
                        }

                        // 所有語言都設定完成後，顯示完整的設定狀態
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: `✅ 翻譯語言設定完成！\n\n` +
                                  `目前設定：\n` +
                                  `主要語言A：${finalSetting.primary_lang_a ? getLanguageDisplayName(finalSetting.primary_lang_a) : '未設定'}\n` +
                                  `主要語言B：${finalSetting.primary_lang_b ? getLanguageDisplayName(finalSetting.primary_lang_b) : '未設定'}\n` +
                                  `次要語言C：${finalSetting.secondary_lang_c ? getLanguageDisplayName(finalSetting.secondary_lang_c) : '未設定'}\n\n` +
                                  `🎉 設定已完成！您現在可以開始使用翻譯功能。\n` +
                                  `• 輸入訊息時會自動翻譯\n` +
                                  `• 使用 /狀態 可以查看目前設定\n` +
                                  `• 使用 /設定 可以重新設定語言`
                        }], env);
                    } catch (error) {
                        console.error('設定次要語言C時發生錯誤:', error);
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: `❌ 設定失敗：${error instanceof Error ? error.message : '未知錯誤'}`
                        }], env);
                    }
                }
                break;

            default:
                console.log('未知的 postback 動作:', action);
                await replyMessage(event.replyToken, [{
                    type: 'text',
                    text: '❌ 無效的操作'
                }], env);
                break;
        }
    } catch (error) {
        console.error('處理 postback 事件時發生錯誤:', error);
        await replyMessage(event.replyToken, [{
            type: 'text',
            text: `❌ 處理請求時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}`
        }], env);
    }
}

// 輔助函數：獲取語言名稱
function getLangName(code: string | null | undefined): string {
    const lang = ALL_LANGUAGES.find(l => l.code === code);
    return lang?.name || code || '未知語言';
}

// 修正 getLanguageDisplayName 函數
function getLanguageDisplayName(langCode: string): string {
    const lang = ALL_LANGUAGES.find(l => l.code === langCode);
    return lang?.name || langCode || '未知語言';
}

export async function replyMessage(replyToken: string, messages: any[], env: Env) {
    try {
        console.log('開始準備發送回覆訊息:', { replyToken });
        console.log('訊息內容:', JSON.stringify(messages, null, 2));
        
        const formattedMessages = messages.map(msg => {
            console.log('格式化訊息:', msg.type);
            if (msg.type === 'flex') {
                return {
                    type: msg.type,
                    altText: msg.altText,
                    contents: msg.contents
                };
            }
            return {
                type: msg.type,
                text: msg.text
            };
        });

        console.log('準備發送到 LINE API');
        console.log('請求內容:', JSON.stringify({
            replyToken: replyToken,
            messages: formattedMessages
        }, null, 2));

        const response = await fetch(`${CONFIG.LINE_API_ENDPOINT}/message/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                replyToken: replyToken,
                messages: formattedMessages
            })
        });

        const responseText = await response.text();
        console.log('LINE API 回應:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
        });

        if (!response.ok) {
            // 記錄到 API 錯誤日誌
            await env.DB.prepare(`
                INSERT INTO api_error_logs (
                    timestamp,
                    api_name,
                    status_code,
                    error_message,
                    request_url,
                    request_body
                ) VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
                new Date().toISOString(),
                'LINE_REPLY',
                response.status,
                responseText,
                `${CONFIG.LINE_API_ENDPOINT}/message/reply`,
                JSON.stringify({
                    replyToken: replyToken,
                    messages: formattedMessages
                })
            ).run();

            throw new Error(`LINE API 錯誤: ${response.status} - ${responseText}`);
        }

        console.log('訊息發送成功');
    } catch (error: unknown) {
        console.error('回覆訊息失敗:', error);
        
        // 記錄到錯誤日誌
        try {
            await env.DB.prepare(`
                INSERT INTO error_logs (
                    timestamp,
                    error_type,
                    error_message,
                    stack_trace,
                    input_text
                ) VALUES (?, ?, ?, ?, ?)
            `).bind(
                new Date().toISOString(),
                'REPLY_MESSAGE',
                error instanceof Error ? error.message : 'Unknown error',
                error instanceof Error ? error.stack : '',
                JSON.stringify(messages)
            ).run();
        } catch (dbError) {
            console.error('記錄錯誤到資料庫失敗:', dbError);
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`LINE API error: ${errorMessage}`);
    }
}

export async function handleLineWebhook(
    request: Request<unknown, CfProperties<unknown>>,
    env: Env
): Promise<Response> {
    try {
        // 更新配置
        updateConfig(env);
        
        const clonedRequest = request.clone() as Request;
        console.log('LINE_CHANNEL_SECRET:', env.LINE_CHANNEL_SECRET); // 添加日誌
        const isValid = await verifySignature(
            clonedRequest,
            env.LINE_CHANNEL_SECRET
        );
        
        if (!isValid) {
            console.error('簽名驗證失敗');
            return new Response('Invalid signature', { status: 403 });
        }

        const rawBody = await request.json() as { events: Array<LineMessageEvent | LinePostbackEvent> };
        const events = rawBody.events;
        
        for (const event of events) {
            console.log('處理事件:', event.type);
            
            if (event.type === 'message' && 'message' in event && event.message.type === 'text') {
                await handleTextMessage(event as LineMessageEvent, env);
            } else if (event.type === 'postback' && 'postback' in event) {
                await handlePostback(event as LinePostbackEvent, env);
            }
        }
        
        return new Response('OK', { status: 200 });
    } catch (error: unknown) {
        console.error('處理 webhook 時發生錯誤:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(errorMessage, { status: 500 });
    }
}

// 新增指令處理函式
async function handleHelpCommand(event: LineMessageEvent, env: Env): Promise<void> {
    await replyMessage(event.replyToken, [{
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
    }], env);
}

// 修改設定指令處理函式
async function handleSettingsCommand(event: LineMessageEvent, env: Env): Promise<void> {
    console.log('處理設定指令');
    try {
        const flexMessage = createLanguageSelectionFlex();
        console.log('生成的 Flex Message:', JSON.stringify(flexMessage, null, 2));
        
        await replyMessage(event.replyToken, [{
            type: 'flex',
            altText: '選擇翻譯語言',
            contents: flexMessage
        }], env);
        
        console.log('設定指令處理完成');
    } catch (error) {
        console.error('處理設定指令時發生錯誤:', error);
        throw error; // 讓上層的錯誤處理機制處理
    }
}

async function handleStatusCommand(
    event: LineMessageEvent,
    env: Env,
    contextId: string,
    contextType: string
): Promise<void> {
    const setting = await getLanguageSetting(env.DB, contextId, contextType);
    if (setting) {
        await replyMessage(event.replyToken, [{
            type: 'text',
            text: `📊 當前翻譯設定：\n` +
                  `主要語言A：${getLangName(setting.primary_lang_a)}\n` +
                  `主要語言B：${getLangName(setting.primary_lang_b)}\n` +
                  `次要語言C：${setting.secondary_lang_c ? getLangName(setting.secondary_lang_c) : '未設定'}\n` +
                  `自動翻譯：${setting.is_translating ? '開啟 ✅' : '關閉 ❌'}`
        }], env);
    } else {
        await replyMessage(event.replyToken, [{
            type: 'text',
            text: '❗ 尚未設定翻譯語言，請使用 /settings 或 /設定 來設定語言。'
        }], env);
    }
}

export async function handleCommand(event: LineMessageEvent, env: Env): Promise<void> {
    const text = String(event.message?.text || '').trim();
    const command = text.slice(1).toLowerCase(); // 移除斜線並轉小寫
    
    console.log('處理指令:', command);
    
    try {
        switch (command) {
            case '說明':
            case 'help':
                console.log('執行說明指令');
                await handleHelpCommand(event, env);
                break;
                
            case '翻譯':
            case 'translate':
            case '設定':
            case 'settings':
                console.log('執行翻譯/設定指令');
                await handleSettingsCommand(event, env);
                break;
                
            case '狀態':
            case 'status':
                console.log('執行狀態指令');
                const contextId = event.source.groupId || event.source.userId || '';
                const contextType = event.source.type;
                await handleStatusCommand(event, env, contextId, contextType);
                break;
                
            default:
                console.log('無效的指令:', command);
                await replyMessage(event.replyToken, [{
                    type: 'text',
                    text: '❌ 無效的指令。請使用 /說明 查看可用指令。'
                }], env);
        }
    } catch (error) {
        console.error('處理指令時發生錯誤:', error);
        
        // 記錄到錯誤日誌
        try {
            await env.DB.prepare(`
                INSERT INTO error_logs (
                    timestamp,
                    error_type,
                    error_message,
                    stack_trace,
                    input_text
                ) VALUES (?, ?, ?, ?, ?)
            `).bind(
                new Date().toISOString(),
                'COMMAND_HANDLER',
                error instanceof Error ? error.message : 'Unknown error',
                error instanceof Error ? error.stack : '',
                command
            ).run();
        } catch (dbError) {
            console.error('記錄錯誤到資料庫失敗:', dbError);
        }

        // 發送錯誤訊息給用戶
        try {
            await replyMessage(event.replyToken, [{
                type: 'text',
                text: '❌ 處理指令時發生錯誤，請稍後再試。'
            }], env);
        } catch (replyError) {
            console.error('發送錯誤訊息失敗:', replyError);
        }
    }
} 