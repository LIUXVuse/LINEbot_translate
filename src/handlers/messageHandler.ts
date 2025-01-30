import { LineMessageEvent, Env } from '../types';
import { translateWithThreeLanguages } from './cloudflareTranslateHandler';
import { 
    getLanguageSetting, 
    updatePrimaryLanguageA,
    updatePrimaryLanguageB,
    updateSecondaryLanguageC
} from './languageHandler';

export async function handleMessage(event: LineMessageEvent, env: Env) {
    try {
        const text = event.message.text;
        
        // 處理指令
        if (text.startsWith('/')) {
            switch (text.toLowerCase()) {
                case '/翻譯':
                case '/translate':
                case '/設定':
                case '/settings':
                    return [{
                        type: 'flex',
                        altText: '翻譯設定',
                        contents: {
                            type: 'bubble',
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '🌐',
                                                size: 'md',
                                                flex: 0
                                            },
                                            {
                                                type: 'text',
                                                text: '翻譯設定',
                                                size: 'xl',
                                                color: '#2EA44F',
                                                weight: 'bold',
                                                margin: 'sm'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        spacing: 'sm',
                                        contents: [
                                            {
                                                type: 'button',
                                                style: 'primary',
                                                color: '#2EA44F',
                                                action: {
                                                    type: 'message',
                                                    label: '設定主要語言 A',
                                                    text: '設定主要語言A'
                                                }
                                            },
                                            {
                                                type: 'button',
                                                style: 'primary',
                                                color: '#2EA44F',
                                                action: {
                                                    type: 'message',
                                                    label: '設定主要語言 B',
                                                    text: '設定主要語言B'
                                                }
                                            },
                                            {
                                                type: 'button',
                                                style: 'secondary',
                                                action: {
                                                    type: 'message',
                                                    label: '設定次要語言 C',
                                                    text: '設定次要語言C'
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '💡 使用說明',
                                                weight: 'bold',
                                                color: '#2EA44F'
                                            },
                                            {
                                                type: 'text',
                                                text: '• 主要語言 A 和 B：必選，用於雙向翻譯',
                                                size: 'sm',
                                                margin: 'sm',
                                                wrap: true
                                            },
                                            {
                                                type: 'text',
                                                text: '• 次要語言 C：選填，同時翻譯成第三種語言',
                                                size: 'sm',
                                                wrap: true
                                            },
                                            {
                                                type: 'text',
                                                text: '✨ 支援 17 種語言互譯',
                                                size: 'sm',
                                                margin: 'lg',
                                                color: '#2EA44F'
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }];
                case '/狀態':
                case '/status':
                    const contextId = event.source.groupId || event.source.userId;
                    const contextType = event.source.type;
                    if (!contextId) {
                        throw new Error('無法獲取上下文 ID');
                    }
                    const setting = await getLanguageSetting(contextId, contextType, env.DB);
                    if (!setting) {
                        return [{
                            type: 'text',
                            text: '尚未設定翻譯語言，請使用 /設定 進行設定'
                        }];
                    }
                    return [{
                        type: 'text',
                        text: `📊 當前翻譯設定：\n主要語言A：${setting.primary_lang_a || '未設定'}\n主要語言B：${setting.primary_lang_b || '未設定'}\n次要語言C：${setting.secondary_lang_c || '未設定'}\n自動翻譯：${setting.is_translating ? '開啟 ✅' : '關閉 ❌'}`
                    }];
                case '/說明':
                case '/help':
                    return [{
                        type: 'text',
                        text: '📖 使用說明：\n\n1. 設定語言\n   /設定 - 設定翻譯語言\n   /狀態 - 查看當前設定\n\n2. 使用翻譯\n   直接發送訊息即可自動翻譯\n\n3. 其他指令\n   /說明 - 顯示此說明\n   /翻譯 - 開始設定翻譯語言'
                    }];
                default:
                    return [{
                        type: 'text',
                        text: '未知的指令，請使用 /說明 查看可用指令'
                    }];
            }
        }

        // 處理語言設定
        if (text.startsWith('設定主要語言') || text.startsWith('設定次要語言')) {
            const contextId = event.source.groupId || event.source.userId;
            const contextType = event.source.type;
            if (!contextId) {
                throw new Error('無法獲取上下文 ID');
            }

            // 處理連續設定的情況（如：設定主要語言A:en:zh-TW:ko）
            const parts = text.split(':');
            const command = parts[0];
            const languages = parts.slice(1);

            if (languages.length > 0) {
                // 有選擇語言，進行設定
                try {
                    if (command === '設定主要語言A' && languages[0]) {
                        await updatePrimaryLanguageA(contextId, contextType, languages[0], env.DB);
                        
                        // 如果有第二個語言，設定為主要語言B
                        if (languages[1]) {
                            await updatePrimaryLanguageB(contextId, contextType, languages[1], env.DB);
                            
                            // 如果有第三個語言，設定為次要語言C
                            if (languages[2]) {
                                await updateSecondaryLanguageC(contextId, contextType, languages[2], env.DB);
                                return [{
                                    type: 'text',
                                    text: `✅ 語言設定完成！\n主要語言A：${getLangName(languages[0])}\n主要語言B：${getLangName(languages[1])}\n次要語言C：${getLangName(languages[2])}`
                                }];
                            }
                            return [{
                                type: 'text',
                                text: `✅ 已設定：\n主要語言A：${getLangName(languages[0])}\n主要語言B：${getLangName(languages[1])}\n\n您可以繼續設定次要語言C，或直接開始使用翻譯功能`
                            }];
                        }
                        return [{
                            type: 'text',
                            text: `✅ 已設定主要語言A為：${getLangName(languages[0])}\n\n請繼續設定主要語言B`
                        }, {
                            type: 'flex',
                            altText: '選擇主要語言 B',
                            contents: createLanguageSelectionBubble('設定主要語言B', '選擇第二個主要語言，用於雙向翻譯')
                        }];
                    } else if (command === '設定主要語言B' && languages[0]) {
                        await updatePrimaryLanguageB(contextId, contextType, languages[0], env.DB);
                        return [{
                            type: 'text',
                            text: `✅ 已設定主要語言B為：${getLangName(languages[0])}\n\n您可以繼續設定次要語言C，或直接開始使用翻譯功能`
                        }, {
                            type: 'flex',
                            altText: '選擇次要語言 C',
                            contents: createLanguageSelectionBubble('設定次要語言C', '選擇次要語言，訊息將同時翻譯成此語言')
                        }];
                    } else if (command === '設定次要語言C' && languages[0]) {
                        await updateSecondaryLanguageC(contextId, contextType, languages[0], env.DB);
                        const setting = await getLanguageSetting(contextId, contextType, env.DB);
                        return [{
                            type: 'text',
                            text: `✅ 語言設定完成！\n\n📊 當前翻譯設定：\n主要語言A：${setting?.primary_lang_a ? getLangName(setting.primary_lang_a) : '未設定'}\n主要語言B：${setting?.primary_lang_b ? getLangName(setting.primary_lang_b) : '未設定'}\n次要語言C：${setting?.secondary_lang_c ? getLangName(setting.secondary_lang_c) : '未設定'}\n自動翻譯：開啟 ✅`
                        }];
                    }
                } catch (error) {
                    console.error('設定語言時發生錯誤:', error);
                    return [{
                        type: 'text',
                        text: '❌ 設定語言時發生錯誤，請稍後再試'
                    }];
                }
            }

            // 顯示語言選擇介面
            const isMainLangA = command === '設定主要語言A';
            const isMainLangB = command === '設定主要語言B';
            const isSecondaryLangC = command === '設定次要語言C';
            
            return [{
                type: 'flex',
                altText: isMainLangA ? '選擇主要語言 A' : 
                         isMainLangB ? '選擇主要語言 B' : 
                         '選擇次要語言 C',
                contents: createLanguageSelectionBubble(
                    command,
                    isMainLangA ? '選擇第一個主要語言，用於雙向翻譯' :
                    isMainLangB ? '選擇第二個主要語言，用於雙向翻譯' :
                    '選擇次要語言，訊息將同時翻譯成此語言'
                )
            }];
        }

        // 獲取聊天上下文ID和類型
        const contextId = event.source.groupId || event.source.userId;
        const contextType = event.source.type;
        if (!contextId) {
            throw new Error('無法獲取上下文 ID');
        }

        // 獲取語言設定
        const setting = await getLanguageSetting(contextId, contextType, env.DB);
        if (!setting || !setting.is_translating || !setting.primary_lang_a || !setting.primary_lang_b) {
            return [];
        }

        // 開始翻譯
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
            setting.secondary_lang_c,
            env
        );

        // 準備回覆訊息
        const messages = [{
            type: 'text',
            text: `🌐 原文：\n${text}`
        }];

        // 添加翻譯結果
        translations.forEach((translation, index) => {
            messages.push({
                type: 'text',
                text: `翻譯 ${index + 1}：\n${translation}`
            });
        });

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

function getLangMap(): { [key: string]: string } {
    return {
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
}

// 新增一個輔助函數來創建語言選擇的 Bubble
function createLanguageSelectionBubble(command: string, description: string) {
    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: '🌐',
                            size: 'md',
                            flex: 0
                        },
                        {
                            type: 'text',
                            text: command === '設定主要語言A' ? '選擇主要語言 A' :
                                  command === '設定主要語言B' ? '選擇主要語言 B' :
                                  '選擇次要語言 C',
                            size: 'xl',
                            color: '#2EA44F',
                            weight: 'bold',
                            margin: 'sm'
                        }
                    ]
                },
                {
                    type: 'text',
                    text: description,
                    size: 'sm',
                    color: '#666666',
                    margin: 'md',
                    wrap: true
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇺🇸 英文 English',
                                text: `${command}:en`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇹🇼 繁體中文',
                                text: `${command}:zh-TW`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇨🇳 簡體中文',
                                text: `${command}:zh-CN`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇯🇵 日文 日本語',
                                text: `${command}:ja`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇰🇷 韓文 한국어',
                                text: `${command}:ko`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇻🇳 越南文 Tiếng Việt',
                                text: `${command}:vi`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇹🇭 泰文 ภาษาไทย',
                                text: `${command}:th`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇷🇺 俄文 Русский',
                                text: `${command}:ru`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇸🇦 阿拉伯文 العربية',
                                text: `${command}:ar`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇫🇷 法文 Français',
                                text: `${command}:fr`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇩🇪 德文 Deutsch',
                                text: `${command}:de`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇪🇸 西班牙文 Español',
                                text: `${command}:es`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇮🇹 義大利文 Italiano',
                                text: `${command}:it`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇲🇾 馬來文 Bahasa Melayu',
                                text: `${command}:ms`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇮🇩 印尼文 Bahasa Indonesia',
                                text: `${command}:id`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇮🇳 印地文 हिन्दी',
                                text: `${command}:hi`
                            },
                            height: 'sm'
                        },
                        {
                            type: 'button',
                            style: 'primary',
                            color: '#2EA44F',
                            action: {
                                type: 'message',
                                label: '🇵🇹 葡萄牙文 Português',
                                text: `${command}:pt`
                            },
                            height: 'sm'
                        }
                    ]
                }
            ]
        }
    };
} 