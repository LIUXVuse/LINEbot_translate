import { CONFIG } from '../config';

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
                    text: "🌐 選擇翻譯語言",
                    weight: "bold",
                    size: "xl",
                    align: "center"
                }]
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "主要翻譯語言",
                                weight: "bold",
                                color: "#1DB446",
                                size: "md"
                            },
                            {
                                type: "separator",
                                margin: "md"
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: "選擇語言",
                                        flex: 4,
                                        size: "sm",
                                        color: "#aaaaaa"
                                    },
                                    {
                                        type: "text",
                                        text: "▼",
                                        flex: 1,
                                        size: "sm",
                                        color: "#aaaaaa",
                                        align: "end"
                                    }
                                ],
                                action: {
                                    type: "postback",
                                    label: "選擇主要翻譯語言",
                                    data: "action=show_primary_langs",
                                    displayText: "選擇主要翻譯語言"
                                },
                                paddingAll: "md",
                                backgroundColor: "#f5f5f5",
                                cornerRadius: "md",
                                margin: "md"
                            }
                        ]
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "次要翻譯語言（選填）",
                                weight: "bold",
                                color: "#1DB446",
                                size: "md",
                                margin: "xl"
                            },
                            {
                                type: "separator",
                                margin: "md"
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: "選擇語言",
                                        flex: 4,
                                        size: "sm",
                                        color: "#aaaaaa"
                                    },
                                    {
                                        type: "text",
                                        text: "▼",
                                        flex: 1,
                                        size: "sm",
                                        color: "#aaaaaa",
                                        align: "end"
                                    }
                                ],
                                action: {
                                    type: "postback",
                                    label: "選擇次要翻譯語言",
                                    data: "action=show_secondary_langs",
                                    displayText: "選擇次要翻譯語言"
                                },
                                paddingAll: "md",
                                backgroundColor: "#f5f5f5",
                                cornerRadius: "md",
                                margin: "md"
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
                        text: "✨ 支援多語言同時翻譯",
                        size: "sm",
                        color: "#888888",
                        align: "center"
                    }
                ]
            }
        }
    };
}

// 生成語言列表選擇介面
function createLanguageListFlex(isSecondary = false) {
    return {
        type: "flex",
        altText: "選擇語言",
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: isSecondary ? "選擇次要翻譯語言" : "選擇主要翻譯語言",
                        weight: "bold",
                        size: "xl",
                        align: "center"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: ALL_LANGUAGES.map(lang => ({
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "text",
                                    text: lang.label,
                                    size: "sm",
                                    gravity: "center"
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
            }
        }
    };
}

// 修改處理文字訊息的函數
async function handleTextMessage(event: LineEvent, env: Env) {
    const message = event.message.text;
    if (!message) return;

    // 檢查是否已處理過這個 token
    if (processedTokens.has(event.replyToken)) {
        return;
    }
    processedTokens.add(event.replyToken);

    if (message === '!翻譯' || message === '/翻譯') {
        await replyMessage(event.replyToken, [{
            type: 'template',
            altText: '請選擇翻譯語言',
            template: {
                type: 'buttons',
                text: '請點擊下方按鈕設定翻譯語言',
                actions: [{
                    type: 'uri',
                    label: '設定翻譯語言',
                    uri: 'https://liff.line.me/2006832947-D4LqNXvV'
                }]
            }
        }], env);
        return;
    }

    // 處理語言代碼輸入
    const langMatch = message.match(/^[!|/](\w{2}(-\w{2})?)/);
    if (langMatch) {
        const langCode = langMatch[1].toLowerCase();
        const lang = ALL_LANGUAGES.find(l => l.code.toLowerCase() === langCode);
        if (lang) {
            await handleLanguageSelection(event, env, lang.code);
            return;
        }
    }

    // 處理一般訊息翻譯
    const groupId = event.source.groupId;
    const settings = userSettings.get(groupId || '');
    if (settings?.isTranslating) {
        try {
            await replyMessage(event.replyToken, [{
                type: 'text',
                text: `[${getLangName(settings.primaryLang)}] 翻譯結果：${message}\n（翻譯功能開發中）`
            }], env);
        } catch (error) {
            console.error('Error translating message:', error);
        }
    }
}

// 處理語言選擇
async function handleLanguageSelection(event: any, env: Env, langCode: string) {
    const groupId = event.source.groupId;
    userSettings.set(groupId, {
        isTranslating: true,
        primaryLang: langCode
    });
    
    await replyMessage(event.replyToken, [{
        type: 'text',
        text: `✅ 已設定翻譯語言：${getLangName(langCode)}\n群組內的訊息將自動翻譯成${getLangName(langCode)}`
    }], env);
}

// 修改處理回調的函數
async function handlePostback(event: any, env: Env) {
    const data = new URLSearchParams(event.postback.data);
    const action = data.get('action');
    const groupId = event.source.groupId;

    switch (action) {
        case 'show_primary_langs':
            await replyMessage(event.replyToken, [createLanguageListFlex(false)], env);
            break;

        case 'show_secondary_langs':
            await replyMessage(event.replyToken, [createLanguageListFlex(true)], env);
            break;

        case 'set_primary_lang':
            const primaryLang = data.get('lang');
            if (primaryLang) {
                const currentSettings = userSettings.get(groupId) || {
                    isTranslating: true,
                    primaryLang: primaryLang
                };
                userSettings.set(groupId, {
                    ...currentSettings,
                    primaryLang
                });
                await replyMessage(event.replyToken, [{
                    type: 'text',
                    text: `✅ 已設定主要翻譯語言：${getLangName(primaryLang)}\n您可以繼續選擇次要翻譯語言，或直接開始使用翻譯功能`
                }], env);
            }
            break;

        case 'set_secondary_lang':
            const secondaryLang = data.get('lang');
            if (secondaryLang) {
                const currentSettings = userSettings.get(groupId);
                if (currentSettings) {
                    userSettings.set(groupId, {
                        ...currentSettings,
                        secondaryLang
                    });
                    await replyMessage(event.replyToken, [{
                        type: 'text',
                        text: `✅ 翻譯設定完成！\n主要語言：${getLangName(currentSettings.primaryLang)}\n次要語言：${getLangName(secondaryLang)}`
                    }], env);
                }
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
    const clonedRequest = request.clone();
    const isValid = await verifySignature(clonedRequest, env.LINE_CHANNEL_SECRET);
    
    if (!isValid) {
        return new Response('Invalid signature', { status: 403 });
    }

    const body = await request.json();
    const events: LineEvent[] = body.events;
    
    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            await handleTextMessage(event, env);
        } else if (event.type === 'postback') {
            await handlePostback(event, env);
        }
    }
    
    return new Response('OK', { status: 200 });
} 