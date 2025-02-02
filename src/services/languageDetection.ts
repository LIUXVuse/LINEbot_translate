export function detectLanguage(text: string): string {
    // 簡單實現中文和英文檢測
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-TW';
    if (/[a-zA-Z]/.test(text)) return 'en';
    return 'unknown';
} 