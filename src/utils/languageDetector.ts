// 新增語言檢測工具
export function detectLanguage(text: string): string {
    // 簡易實現，可替換為正式檢測邏輯
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh-TW';
    if (/[ぁ-んァ-ン]/.test(text)) return 'ja';
    if (/[가-힣]/.test(text)) return 'ko';
    return 'en';
} 