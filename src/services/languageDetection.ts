import { SupportedLanguageCode } from '../handlers/groqTranslateHandler';

// 語言特徵正則表達式
const LANGUAGE_PATTERNS = {
    'th': /[\u0E00-\u0E7F]/,    // 泰文字符
    'zh-TW': /[\u4E00-\u9FFF]/, // 中文字符
    'ja': /[\u3040-\u309F\u30A0-\u30FF]/, // 日文假名
    'ko': /[\u3130-\u318F\uAC00-\uD7AF]/, // 韓文
    'en': /^[a-zA-Z0-9\s.,!?'"-]+$/,      // 英文
    'vi': /[\u0300-\u036F\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/, // 越南文
    'ru': /[\u0400-\u04FF]/, // 俄文
    'ar': /[\u0600-\u06FF]/, // 阿拉伯文
};

// 改進的語言檢測函數
export async function detectLanguage(text: string): Promise<SupportedLanguageCode> {
    if (!text) return 'en';

    // 計算每種語言的字符匹配度
    const langScores = new Map<SupportedLanguageCode, number>();

    // 初始化分數
    Object.keys(LANGUAGE_PATTERNS).forEach(lang => {
        langScores.set(lang as SupportedLanguageCode, 0);
    });

    // 計算每個字符的語言特徵
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        Object.entries(LANGUAGE_PATTERNS).forEach(([lang, pattern]) => {
            if (pattern.test(char)) {
                langScores.set(
                    lang as SupportedLanguageCode,
                    (langScores.get(lang as SupportedLanguageCode) || 0) + 1
                );
            }
        });
    }

    // 找出最高分的語言
    let maxScore = 0;
    let detectedLang: SupportedLanguageCode = 'en';

    langScores.forEach((score, lang) => {
        if (score > maxScore) {
            maxScore = score;
            detectedLang = lang;
        }
    });

    // 如果沒有明顯的語言特徵，預設為英文
    if (maxScore === 0) {
        return 'en';
    }

    console.log('語言檢測結果:', {
        text: text.slice(0, 50),
        detectedLang,
        scores: Object.fromEntries(langScores)
    });

    return detectedLang;
}

// 輔助函數：檢查文字是否包含特定語言的字符
export function containsLanguage(text: string, lang: SupportedLanguageCode): boolean {
    const pattern = LANGUAGE_PATTERNS[lang];
    if (!pattern) return false;
    return pattern.test(text);
} 