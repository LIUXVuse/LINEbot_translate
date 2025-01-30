import { CONFIG } from '../config';
import { Env, LineEvent, LineMessageEvent, LinePostbackEvent } from '../types';
import {
    LanguageSetting,
    saveLanguageSetting,
    getLanguageSetting,
    updatePrimaryLanguageA,
    updatePrimaryLanguageB,
    updateSecondaryLanguageC,
    toggleTranslation
} from './languageHandler';
import { translateWithThreeLanguages } from './cloudflareTranslateHandler';

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

// 驗證 LINE 簽名
async function verifySignature(request: Request, secret: string): Promise<boolean> {
    const signature = request.headers.get('x-line-signature');
    if (!signature) {
        console.error('缺少簽名');
        return false;
    }

    const body = await request.text();
    console.log('收到的請求內容:', body);  // 添加日誌
    
    // 使用 Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const bodyBuffer = encoder.encode(body);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBuffer);
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    console.log('計算的簽名:', signatureBase64);  // 添加日誌
    console.log('收到的簽名:', signature);  // 添加日誌
    
    return signatureBase64 === signature;
}

// 生成語言選擇介面
export function createLanguageSelectionFlex() {
    return {
        type: "flex",
        altText: "選擇翻譯語言",
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [{
                    type: "text",
                    text: "🌐 翻譯設定",
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
                        text: "請選擇要設定的項目：",
                        size: "md",
                        weight: "bold",
                        margin: "md"
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "📝 設定主要語言A",
                            data: "action=show_primary_lang_a",
                            displayText: "設定主要語言A"
                        },
                        style: "primary",
                        margin: "md",
                        height: "sm"
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "📝 設定主要語言B",
                            data: "action=show_primary_lang_b",
                            displayText: "設定主要語言B"
                        },
                        style: "primary",
                        margin: "md",
                        height: "sm"
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "📝 設定次要語言C",
                            data: "action=show_secondary_lang_c",
                            displayText: "設定次要語言C"
                        },
                        style: "secondary",
                        margin: "md",
                        height: "sm"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "xl",
                        contents: [
                            {
                                type: "text",
                                text: "💡 使用說明",
                                weight: "bold",
                                size: "sm",
                                color: "#1DB446"
                            },
                            {
                                type: "text",
                                text: "• 主要語言A和B：必選，用於雙向翻譯",
                                size: "xs",
                                color: "#aaaaaa",
                                margin: "sm",
                                wrap: true
                            },
                            {
                                type: "text",
                                text: "• 次要語言C：選填，同時翻譯成第三種語言",
                                size: "xs",
                                color: "#aaaaaa",
                                wrap: true
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "✨ 支援17種語言互譯",
                        size: "sm",
                        color: "#888888",
                        align: "center"
                    }
                ]
            },
            styles: {
                header: {
                    backgroundColor: "#f5f5f5"
                }
            }
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

// 修改處理文字訊息的函數
async function handleTextMessage(event: LineMessageEvent, env: Env) {
    const text = event.message.text.trim();
    const contextId = event.source.groupId || event.source.roomId || event.source.userId || '';
    const contextType = event.source.type;
    
    console.log('收到訊息:', text);
    
    // 處理指令
    if (text.startsWith('/')) {
        const command = text.toLowerCase();
        console.log('處理指令:', command);
        
        switch (command) {
            case '/說明':
            case '/help':
                console.log('執行說明指令');
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
                return;

            case '/翻譯':
            case '/translate':
            case '/設定':
            case '/settings':
                console.log('執行翻譯設定指令');
                await replyMessage(event.replyToken, [createLanguageSelectionFlex()], env);
                return;

            case '/status':
            case '/狀態':
                console.log('執行狀態查詢指令');
                const setting = await getLanguageSetting(env.DB, contextId);
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
                return;
        }
    }

    // 處理一般訊息的翻譯
    if (!contextId) {
        console.error('無法獲取 contextId');
        return;
    }

    const setting = await getLanguageSetting(env.DB, contextId);
    if (setting && setting.is_translating) {
        try {
            console.log('開始翻譯訊息:', {
                text,
                primaryLangA: setting.primary_lang_a,
                primaryLangB: setting.primary_lang_b,
                secondaryLangC: setting.secondary_lang_c
            });

            // 使用 Cloudflare 翻譯服務
            const translations = await translateWithThreeLanguages(
                text,
                setting.primary_lang_a,
                setting.primary_lang_b,
                setting.secondary_lang_c || null,
                env
            );

            // 檢查翻譯結果
            if (!translations || translations.length === 0) {
                throw new Error('未收到翻譯結果');
            }

            // 準備回覆訊息
            const messages: Array<{type: string, text: string}> = [];
            
            // 原文
            messages.push({
                type: 'text',
                text: `🌐 原文：\n${text}`
            });

            // 主要語言A翻譯
            if (translations[0]) {
                messages.push({
                    type: 'text',
                    text: `翻譯 (${getLangName(setting.primary_lang_a)})：\n${translations[0]}`
                });
            }

            // 主要語言B翻譯
            if (translations[1]) {
                messages.push({
                    type: 'text',
                    text: `翻譯 (${getLangName(setting.primary_lang_b)})：\n${translations[1]}`
                });
            }

            // 次要語言C翻譯（如果有）
            if (setting.secondary_lang_c && translations[2]) {
                messages.push({
                    type: 'text',
                    text: `翻譯 (${getLangName(setting.secondary_lang_c)})：\n${translations[2]}`
                });
            }

            console.log('準備發送翻譯結果:', messages);

            // 發送翻譯結果
            await replyMessage(event.replyToken, messages, env);
            
        } catch (error) {
            console.error('翻譯過程中發生錯誤:', error);
            let errorMessage = '❌ 翻譯過程中發生錯誤，請稍後再試。';
            
            // 根據錯誤類型顯示不同的錯誤訊息
            if (error.message.includes('過載') || error.message.includes('429')) {
                errorMessage = '⚠️ 翻譯服務暫時過載，請稍後再試。';
            } else if (error.message.includes('限制')) {
                errorMessage = '⚠️ 已達到翻譯限制，請稍後再試。';
            } else if (error.message.includes('未收到翻譯結果')) {
                errorMessage = '⚠️ 無法完成翻譯，請確認文字內容後重試。';
            }
            
            await replyMessage(event.replyToken, [{
                type: 'text',
                text: errorMessage
            }], env);
        }
    } else {
        console.log('未啟用翻譯或尚未設定語言');
    }
}

// 處理 postback 事件
export async function handlePostback(event: LinePostbackEvent, env: Env): Promise<void> {
    const data = new URLSearchParams(event.postback.data);
    const action = data.get('action');
    const contextId = event.source.groupId || event.source.userId || event.source.roomId;
    const contextType = event.source.type;

    if (!contextId) {
        throw new Error('無法獲取上下文 ID');
    }

    console.log('處理 postback 事件:', { action, data: event.postback.data });

    try {
        switch (action) {
            case 'show_primary_langs':
                await replyMessage(event.replyToken, [createLanguageListFlex('a')], env);
                break;

            case 'show_secondary_langs':
                await replyMessage(event.replyToken, [createLanguageListFlex('c')], env);
                break;

            case 'set_primary_lang_a':
            case 'set_primary_lang_b':
            case 'set_secondary_lang_c':
                const lang = data.get('lang');
                if (lang) {
                    try {
                        // 檢查是否已有設定
                        let setting = await getLanguageSetting(env.DB, contextId);
                        
                        if (setting) {
                            // 更新現有設定
                            if (action === 'set_primary_lang_a') {
                                await updatePrimaryLanguageA(env.DB, contextId, lang);
                            } else if (action === 'set_primary_lang_b') {
                                await updatePrimaryLanguageB(env.DB, contextId, lang);
                            } else if (action === 'set_secondary_lang_c') {
                                await updateSecondaryLanguageC(env.DB, contextId, lang);
                            }
                        } else {
                            // 創建新設定
                            await saveLanguageSetting(env.DB, {
                                context_id: contextId,
                                context_type: contextType,
                                primary_lang: lang,
                                is_translating: true
                            });
                        }

                        // 確認設定已更新
                        setting = await getLanguageSetting(env.DB, contextId);
                        if (!setting) {
                            throw new Error('無法確認設定已更新');
                        }

                        // 回覆成功訊息
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: `✅ 已設定${action.replace('_', ' ')}為：${getLanguageDisplayName(lang)}\n\n您可以繼續設定其他語言，或直接開始使用翻譯功能。`
                        }], env);
                    } catch (error) {
                        console.error(`設定${action.replace('_', ' ')}時發生錯誤:`, error);
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: `❌ 設定失敗：${error.message}`
                        }], env);
                    }
                }
                break;
        }
    } catch (error) {
        console.error('處理 postback 事件時發生錯誤:', error);
        await replyMessage(event.replyToken, [{
            type: 'text',
            text: `❌ 處理請求時發生錯誤：${error.message}`
        }], env);
    }
}

// 輔助函數：獲取語言名稱
function getLangName(code: string | null): string {
    const lang = ALL_LANGUAGES.find(l => l.code === code);
    return lang?.name || code || '未知語言';
}

// 修正 getLanguageDisplayName 函數
function getLanguageDisplayName(langCode: string): string {
    const lang = ALL_LANGUAGES.find(l => l.code === langCode);
    return lang?.name || langCode || '未知語言';
}

async function replyMessage(replyToken: string, messages: any[], env: Env) {
    const response = await fetch(`${CONFIG.LINE_API_ENDPOINT}/message/reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            replyToken: replyToken,
            messages: messages
        })
    });

    if (!response.ok) {
        throw new Error(`LINE API error: ${response.statusText}`);
    }
}

export async function handleLineWebhook(request: Request, env: Env) {
    try {
        const clonedRequest = request.clone();
        const isValid = await verifySignature(clonedRequest, env.LINE_CHANNEL_SECRET);
        
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
    } catch (error) {
        console.error('處理 webhook 時發生錯誤:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
} 