import { LinePostbackEvent, Env } from '../types';
import { 
    getLanguageSetting, 
    saveLanguageSetting, 
    updatePrimaryLanguageA,
    updatePrimaryLanguageB,
    updateSecondaryLanguageC,
    toggleTranslation,
    LanguageSetting 
} from './languageHandler';
import { createLanguageListFlex } from './lineHandler';

export async function handlePostback(event: LinePostbackEvent, env: Env): Promise<any[]> {
    try {
        const data = new URLSearchParams(event.postback.data);
        const action = data.get('action');
        
        // 獲取上下文 ID
        const contextId = event.source.groupId || event.source.roomId || event.source.userId;
        const contextType = event.source.type;
        
        if (!contextId) {
            throw new Error('無法獲取對話 ID');
        }

        switch (action) {
            case 'show_primary_lang_a':
                return [{
                    type: 'flex',
                    altText: '選擇主要語言A',
                    contents: createLanguageListFlex('a')
                }];

            case 'show_primary_lang_b':
                return [{
                    type: 'flex',
                    altText: '選擇主要語言B',
                    contents: createLanguageListFlex('b')
                }];

            case 'show_secondary_lang_c':
                return [{
                    type: 'flex',
                    altText: '選擇次要語言C',
                    contents: createLanguageListFlex('c')
                }];

            case 'set_primary_lang_a':
                const langA = data.get('lang');
                if (langA) {
                    try {
                        // 檢查是否已有設定
                        let setting = await getLanguageSetting(env.DB, contextId, contextType);
                        
                        if (!setting) {
                            // 如果沒有設定，創建新設定
                            setting = {
                                context_id: contextId,
                                context_type: contextType as 'group' | 'room' | 'user',
                                primary_lang_a: langA || '',
                                primary_lang_b: '',
                                secondary_lang_c: '',
                                is_translating: true
                            };
                        } else {
                            // 更新現有設定
                            setting.primary_lang_a = langA || '';
                        }
                        
                        await saveLanguageSetting(env.DB, setting);

                        return [{
                            type: 'text',
                            text: `✅ 已設定主要語言A為：${getLangName(langA)}\n\n請繼續設定主要語言B`
                        }, {
                            type: 'flex',
                            altText: '選擇主要語言B',
                            contents: createLanguageListFlex('b')
                        }];
                    } catch (error) {
                        console.error('設定主要語言A時發生錯誤:', error);
                        return [{
                            type: 'text',
                            text: `❌ 設定失敗：${error.message}`
                        }];
                    }
                }
                break;

            case 'set_primary_lang_b':
                const langB = data.get('lang');
                if (langB) {
                    try {
                        // 檢查是否已有設定
                        const setting = await getLanguageSetting(env.DB, contextId, contextType);
                        if (!setting || !setting.primary_lang_a) {
                            throw new Error('請先設定主要語言A');
                        }

                        // 更新主要語言B
                        setting.primary_lang_b = langB || '';
                        await saveLanguageSetting(env.DB, setting);

                        return [{
                            type: 'text',
                            text: `✅ 已設定主要語言B為：${getLangName(langB)}\n\n您可以繼續設定次要語言C，或直接開始使用翻譯功能`
                        }, {
                            type: 'flex',
                            altText: '選擇次要語言C',
                            contents: createLanguageListFlex('c')
                        }];
                    } catch (error) {
                        console.error('設定主要語言B時發生錯誤:', error);
                        return [{
                            type: 'text',
                            text: `❌ 設定失敗：${error.message}`
                        }];
                    }
                }
                break;

            case 'set_secondary_lang_c':
                const langC = data.get('lang');
                if (langC) {
                    try {
                        // 檢查是否已有主要語言設定
                        const setting = await getLanguageSetting(env.DB, contextId, contextType);
                        if (!setting || !setting.primary_lang_a || !setting.primary_lang_b) {
                            throw new Error('請先設定主要語言A和B');
                        }

                        // 更新次要語言C
                        setting.secondary_lang_c = langC || '';
                        await saveLanguageSetting(env.DB, setting);

                        return [{
                            type: 'text',
                            text: `✅ 語言設定已更新！\n\n` +
                                  `📊 當前翻譯設定：\n` +
                                  `主要語言A：${getLangName(setting.primary_lang_a)}\n` +
                                  `主要語言B：${getLangName(setting.primary_lang_b)}\n` +
                                  `次要語言C：${getLangName(langC)}\n` +
                                  `自動翻譯：${setting.is_translating ? '開啟 ✅' : '關閉 ❌'}\n\n` +
                                  `您現在可以開始使用翻譯功能了！`
                        }];
                    } catch (error) {
                        console.error('設定次要語言C時發生錯誤:', error);
                        return [{
                            type: 'text',
                            text: `❌ 設定失敗：${error.message}`
                        }];
                    }
                }
                break;

            case 'toggle_translation':
                const isTranslating = data.get('enable') === 'true';
                await toggleTranslation(env.DB, contextId, isTranslating);
                return [{
                    type: 'text',
                    text: isTranslating ? '✅ 已開啟翻譯功能' : '❌ 已關閉翻譯功能'
                }];
        }

        return [];
    } catch (error) {
        console.error('處理 postback 時發生錯誤:', error);
        return [{
            type: 'text',
            text: `❌ 設定發生錯誤：${error.message}`
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