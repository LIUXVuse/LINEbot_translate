import { D1Database } from '@cloudflare/workers-types';

// 定義語言設定介面
export interface LanguageSetting {
    context_id: string;
    context_type: 'group' | 'room' | 'user';
    primary_lang: string;
    secondary_lang?: string;
    is_translating: boolean;
}

// 儲存語言設定
export async function saveLanguageSetting(
    db: D1Database,
    setting: LanguageSetting
): Promise<void> {
    const { context_id, context_type, primary_lang, secondary_lang, is_translating } = setting;
    
    console.log('準備儲存設定:', JSON.stringify({
        context_id,
        context_type,
        primary_lang,
        secondary_lang,
        is_translating
    }, null, 2));

    try {
        const result = await db.prepare(`
            INSERT INTO language_settings 
            (context_id, context_type, primary_lang, secondary_lang, is_translating)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(context_id) DO UPDATE SET
                primary_lang = excluded.primary_lang,
                secondary_lang = excluded.secondary_lang,
                is_translating = excluded.is_translating,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            context_id,
            context_type,
            primary_lang,
            secondary_lang || null,
            is_translating ? 1 : 0
        ).run();
        
        console.log('設定儲存結果:', result);
        
        // 驗證設定是否成功儲存
        const saved = await getLanguageSetting(db, context_id);
        console.log('儲存後的設定:', JSON.stringify(saved, null, 2));
        
        if (!saved) {
            throw new Error('設定儲存失敗：無法讀取已儲存的設定');
        }
    } catch (error) {
        console.error('儲存設定時發生錯誤:', error);
        throw error;
    }
}

// 獲取語言設定
export async function getLanguageSetting(
    db: D1Database,
    contextId: string
): Promise<LanguageSetting | null> {
    try {
        const result = await db.prepare(`
            SELECT 
                context_id,
                context_type,
                primary_lang,
                secondary_lang,
                is_translating
            FROM language_settings 
            WHERE context_id = ?
        `).bind(contextId)
        .first();
        
        if (!result) return null;
        
        // 確保布林值正確轉換
        return {
            ...result,
            is_translating: result.is_translating === 1
        } as LanguageSetting;
    } catch (error) {
        console.error('獲取語言設定時發生錯誤:', error);
        throw error;
    }
}

// 更新主要語言
export async function updatePrimaryLanguage(
    db: D1Database,
    contextId: string,
    primaryLang: string
): Promise<void> {
    await db.prepare(`
        UPDATE language_settings
        SET primary_lang = ?, updated_at = CURRENT_TIMESTAMP
        WHERE context_id = ?
    `).bind(primaryLang, contextId)
    .run();
}

// 更新次要語言
export async function updateSecondaryLanguage(
    db: D1Database,
    contextId: string,
    secondaryLang: string | null
): Promise<void> {
    // 先檢查是否已有設定
    const existing = await getLanguageSetting(db, contextId);
    if (!existing) {
        throw new Error('尚未設定主要語言');
    }

    await db.prepare(`
        UPDATE language_settings
        SET secondary_lang = ?, updated_at = CURRENT_TIMESTAMP
        WHERE context_id = ?
    `).bind(secondaryLang, contextId)
    .run();
}

// 切換翻譯狀態
export async function toggleTranslation(
    db: D1Database,
    contextId: string,
    isTranslating: boolean
): Promise<void> {
    await db.prepare(`
        UPDATE language_settings
        SET is_translating = ?, updated_at = CURRENT_TIMESTAMP
        WHERE context_id = ?
    `).bind(isTranslating, contextId)
    .run();
}

// 刪除語言設定
export async function deleteLanguageSetting(
    db: D1Database,
    contextId: string
): Promise<void> {
    await db.prepare(`
        DELETE FROM language_settings WHERE context_id = ?
    `).bind(contextId)
    .run();
}

// 檢查語言設定是否存在
export async function hasLanguageSetting(
    db: D1Database,
    contextId: string
): Promise<boolean> {
    const result = await db.prepare(`
        SELECT 1 FROM language_settings WHERE context_id = ?
    `).bind(contextId)
    .first();
    
    return result !== null;
} 