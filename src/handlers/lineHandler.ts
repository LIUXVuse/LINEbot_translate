import { CONFIG } from '../config';
import { Env, LineEvent, LineMessageEvent, LinePostbackEvent } from '../types';
import {
    LanguageSetting,
    saveLanguageSetting,
    getLanguageSetting,
    updatePrimaryLanguage,
    updateSecondaryLanguage,
    toggleTranslation
} from './languageHandler';
import { translateWithSecondary } from './translateHandler';

// 儲存使用者的翻譯設定
const userSettings = new Map<string, {
    isTranslating: boolean,
    primaryLang: string,
    secondaryLang?: string
}>();

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
    if (!signature) return false;

    const body = await request.text();
    
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
    
    return signatureBase64 === signature;
}

// 生成語言選擇介面
function createLanguageSelectionFlex() {
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
                            label: "📝 設定主要翻譯語言",
                            data: "action=show_primary_langs",
                            displayText: "設定主要翻譯語言"
                        },
                        style: "primary",
                        margin: "md",
                        height: "sm"
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "📝 設定次要翻譯語言",
                            data: "action=show_secondary_langs",
                            displayText: "設定次要翻譯語言"
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
                                text: "• 主要語言：必選，將自動翻譯成此語言",
                                size: "xs",
                                color: "#aaaaaa",
                                margin: "sm",
                                wrap: true
                            },
                            {
                                type: "text",
                                text: "• 次要語言：選填，可同時翻譯成兩種語言",
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
function createLanguageListFlex(isSecondary = false) {
    const title = isSecondary ? "選擇次要翻譯語言" : "選擇主要翻譯語言";
    const description = isSecondary ? 
        "選擇一個次要語言，訊息將同時翻譯成兩種語言" : 
        "選擇一個主要語言，所有訊息將自動翻譯成此語言";

    return {
        type: "flex",
        altText: title,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: `🌐 ${title}`,
                        weight: "bold",
                        size: "xl",
                        align: "center",
                        color: "#1DB446"
                    }
                ],
                backgroundColor: "#f5f5f5"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: description,
                        size: "sm",
                        color: "#888888",
                        wrap: true,
                        margin: "md"
                    },
                    {
                        type: "separator",
                        margin: "xl"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "xl",
                        spacing: "sm",
                        contents: ALL_LANGUAGES.map(lang => ({
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "text",
                                    text: lang.label,
                                    size: "sm",
                                    gravity: "center",
                                    flex: 1
                                }
                            ],
                            action: {
                                type: "postback",
                                label: lang.name,
                                data: `action=set_${isSecondary ? 'secondary' : 'primary'}_lang&lang=${lang.code}`,
                                displayText: `選擇 ${lang.name}`
                            },
                            paddingAll: "md",
                            backgroundColor: "#f5f5f5",
                            cornerRadius: "md",
                            margin: "xs"
                        }))
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "返回設定選單",
                            data: "action=back_to_settings",
                            displayText: "返回設定選單"
                        },
                        style: "link"
                    }
                ]
            }
        }
    };
}

// 修改處理文字訊息的函數
async function handleTextMessage(event: LineMessageEvent, env: Env) {
    const text = event.message.text.trim();
    const contextId = event.source.groupId || event.source.roomId || event.source.userId;
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
                        `• 可以設定主要和次要翻譯語言\n` +
                        `• 支援多國語言互譯\n\n` +
                        `3️⃣ 注意事項：\n` +
                        `• 翻譯功能預設為開啟狀態\n` +
                        `• 可隨時更改語言設定\n` +
                        `• 如有問題請使用 /說明 查看說明`
                }], env);
                return;

            case '/翻譯':
            case '/translate':
                const setting = await getLanguageSetting(env.DB, contextId);
                if (setting) {
                    // 如果已有設定，顯示當前設定和重新設定選項
                    await replyMessage(event.replyToken, [{
                        type: 'flex',
                        altText: '翻譯設定',
                        contents: {
                            type: 'bubble',
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📝 當前翻譯設定',
                                        weight: 'bold',
                                        size: 'xl',
                                        align: 'center',
                                        color: '#1DB446'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: `主要語言：${getLangName(setting.primary_lang)}`,
                                                size: 'md',
                                                margin: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `次要語言：${setting.secondary_lang ? getLangName(setting.secondary_lang) : '未設定'}`,
                                                size: 'md',
                                                margin: 'sm'
                                            }
                                        ]
                                    }
                                ]
                            },
                            footer: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: '重新設定語言',
                                            data: 'action=show_primary_langs',
                                            displayText: '重新設定語言'
                                        },
                                        style: 'primary'
                                    }
                                ]
                            },
                            styles: {
                                body: {
                                    backgroundColor: '#FFFFFF'
                                }
                            }
                        }
                    }], env);
                } else {
                    // 如果沒有設定，顯示語言選擇介面
                    await replyMessage(event.replyToken, [createLanguageSelectionFlex()], env);
                }
                return;

            case '/settings':
            case '/設定':
                await replyMessage(event.replyToken, [createLanguageSelectionFlex()], env);
                return;
                
            case '/status':
            case '/狀態':
                const statusSetting = await getLanguageSetting(env.DB, contextId);
                if (statusSetting) {
                    const message = {
                        type: 'text',
                        text: `📊 當前翻譯設定：\n主要語言：${getLangName(statusSetting.primary_lang)}\n次要語言：${statusSetting.secondary_lang ? getLangName(statusSetting.secondary_lang) : '未設定'}\n自動翻譯：${statusSetting.is_translating ? '開啟 ✅' : '關閉 ❌'}`
                    };
                    await replyMessage(event.replyToken, [message], env);
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
    const setting = await getLanguageSetting(env.DB, contextId);
    if (setting && setting.is_translating) {
        try {
            console.log('開始翻譯訊息:', {
                text,
                primaryLang: setting.primary_lang,
                secondaryLang: setting.secondary_lang
            });

            const translations = await translateWithSecondary(
                text,
                setting.primary_lang,
                setting.secondary_lang || null,
                env
            );

            // 準備回覆訊息
            const messages = [];
            
            // 原文
            messages.push({
                type: 'text',
                text: `🌐 原文：\n${text}`
            });

            // 主要語言翻譯
            messages.push({
                type: 'text',
                text: `翻譯 (${getLangName(setting.primary_lang)})：\n${translations[0]}`
            });

            // 次要語言翻譯（如果有）
            if (setting.secondary_lang && translations[1]) {
                messages.push({
                    type: 'text',
                    text: `翻譯 (${getLangName(setting.secondary_lang)})：\n${translations[1]}`
                });
            }

            // 發送翻譯結果
            await replyMessage(event.replyToken, messages, env);
            
        } catch (error) {
            console.error('翻譯過程中發生錯誤:', error);
            await replyMessage(event.replyToken, [{
                type: 'text',
                text: '❌ 翻譯過程中發生錯誤，請稍後再試。'
            }], env);
        }
    }
}

// 修改處理 postback 的函數
async function handlePostback(event: LinePostbackEvent, env: Env) {
    const data = new URLSearchParams(event.postback.data);
    const action = data.get('action');
    const contextId = event.source.groupId || event.source.roomId || event.source.userId;
    const contextType = event.source.type;

    switch (action) {
        case 'back_to_settings':
            await replyMessage(event.replyToken, [createLanguageSelectionFlex()], env);
            break;

        case 'show_primary_langs':
            await replyMessage(event.replyToken, [createLanguageListFlex(false)], env);
            break;

        case 'show_secondary_langs':
            await replyMessage(event.replyToken, [createLanguageListFlex(true)], env);
            break;

        case 'set_primary_lang':
            const primaryLang = data.get('lang');
            if (primaryLang) {
                try {
                    // 確保 contextType 是正確的類型
                    let type: 'user' | 'group' | 'room' = 'user';
                    if (event.source.type === 'group') type = 'group';
                    if (event.source.type === 'room') type = 'room';

                    const setting: LanguageSetting = {
                        context_id: contextId,
                        context_type: type,
                        primary_lang: primaryLang,
                        is_translating: true
                    };
                    
                    console.log('儲存語言設定:', setting); // 添加日誌
                    await saveLanguageSetting(env.DB, setting);
                    
                    // 修改回應訊息，使用 Flex Message
                    await replyMessage(event.replyToken, [{
                        type: 'flex',
                        altText: '語言設定成功',
                        contents: {
                            type: 'bubble',
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '✅ 主要語言設定成功',
                                        weight: 'bold',
                                        size: 'lg',
                                        align: 'center',
                                        color: '#1DB446'
                                    },
                                    {
                                        type: 'text',
                                        text: `已設定為：${getLangName(primaryLang)}`,
                                        size: 'md',
                                        align: 'center',
                                        margin: 'md'
                                    }
                                ]
                            },
                            footer: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: '設定次要語言',
                                            data: 'action=show_secondary_langs',
                                            displayText: '設定次要語言'
                                        },
                                        style: 'primary'
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: '完成設定',
                                            data: 'action=finish_settings',
                                            displayText: '完成設定'
                                        },
                                        style: 'secondary',
                                        margin: 'md'
                                    }
                                ]
                            }
                        }
                    }], env);
                } catch (error) {
                    console.error('設定主要語言時發生錯誤:', error);
                    await replyMessage(event.replyToken, [{
                        type: 'text',
                        text: '❌ 設定失敗，請稍後再試。'
                    }], env);
                }
            }
            break;

        case 'set_secondary_lang':
            const secondaryLang = data.get('lang');
            if (secondaryLang) {
                try {
                    await updateSecondaryLanguage(env.DB, contextId, secondaryLang);
                    
                    // 獲取完整設定以確認
                    const updatedSetting = await getLanguageSetting(env.DB, contextId);
                    if (updatedSetting) {
                        await replyMessage(event.replyToken, [{
                            type: 'flex',
                            altText: '語言設定成功',
                            contents: {
                                type: 'bubble',
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '✅ 次要語言設定成功',
                                            weight: 'bold',
                                            size: 'lg',
                                            align: 'center',
                                            color: '#1DB446'
                                        },
                                        {
                                            type: 'box',
                                            layout: 'vertical',
                                            margin: 'lg',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: `主要語言：${getLangName(updatedSetting.primary_lang)}`,
                                                    size: 'md'
                                                },
                                                {
                                                    type: 'text',
                                                    text: `次要語言：${getLangName(secondaryLang)}`,
                                                    size: 'md',
                                                    margin: 'md'
                                                }
                                            ]
                                        }
                                    ]
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'button',
                                            action: {
                                                type: 'postback',
                                                label: '完成設定',
                                                data: 'action=finish_settings',
                                                displayText: '完成設定'
                                            },
                                            style: 'primary'
                                        }
                                    ]
                                }
                            }
                        }], env);
                    }
                } catch (error) {
                    console.error('設定次要語言時發生錯誤:', error);
                    if (error.message === '尚未設定主要語言') {
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: '❌ 請先設定主要翻譯語言。\n使用 /翻譯 指令開始設定。'
                        }], env);
                    } else {
                        await replyMessage(event.replyToken, [{
                            type: 'text',
                            text: '❌ 設定失敗，請稍後再試。'
                        }], env);
                    }
                }
            }
            break;

        case 'toggle_translation':
            const isTranslating = data.get('enable') === 'true';
            await toggleTranslation(env.DB, contextId, isTranslating);
            const message = {
                type: 'text',
                text: isTranslating ? '✅ 已開啟自動翻譯' : '❌ 已關閉自動翻譯'
            };
            await replyMessage(event.replyToken, [message], env);
            break;

        case 'finish_settings':
            const currentSetting = await getLanguageSetting(env.DB, contextId);
            if (currentSetting) {
                await replyMessage(event.replyToken, [{
                    type: 'text',
                    text: `✨ 設定完成！\n\n` +
                          `主要語言：${getLangName(currentSetting.primary_lang)}\n` +
                          `次要語言：${currentSetting.secondary_lang ? getLangName(currentSetting.secondary_lang) : '未設定'}\n` +
                          `翻譯狀態：${currentSetting.is_translating ? '開啟 ✅' : '關閉 ❌'}\n\n` +
                          `您現在可以開始使用翻譯功能了！\n` +
                          `• 直接發送訊息即可自動翻譯\n` +
                          `• 使用 /狀態 查看目前設定\n` +
                          `• 使用 /說明 查看更多說明`
                }], env);
            }
            break;
    }
}

// 輔助函數：獲取語言名稱
function getLangName(code: string | null): string {
    const lang = ALL_LANGUAGES.find(l => l.code === code);
    return lang?.name || code || '未知語言';
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

        const rawBody = await request.json() as { events: LineEvent[] };
        const events = rawBody.events;
        
        for (const event of events) {
            console.log('處理事件:', event.type);
            if (event.type === 'message' && event.message.type === 'text') {
                await handleTextMessage(event as LineMessageEvent, env);
            } else if (event.type === 'postback') {
                await handlePostback(event as LinePostbackEvent, env);
            }
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('處理 webhook 時發生錯誤:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
} 