import { D1Database } from '@cloudflare/workers-types';

// 定義語言設定介面
export interface LanguageSetting {
    context_id: string;
    context_type: 'group' | 'room' | 'user';
    primary_lang_a: string;
    primary_lang_b: string;
    secondary_lang_c?: string;
    is_translating: boolean;
}

// 儲存語言設定
export async function saveLanguageSetting(
    db: D1Database,
    setting: LanguageSetting
): Promise<void> {
    console.log('準備儲存設定:', JSON.stringify(setting, null, 2));

    try {
        // 確保所有必要欄位都有值
        const safeSettings = {
            context_id: setting.context_id,
            context_type: setting.context_type || 'user',
            primary_lang_a: setting.primary_lang_a || '',
            primary_lang_b: setting.primary_lang_b || '',
            secondary_lang_c: setting.secondary_lang_c || '',
            is_translating: setting.is_translating === undefined ? true : setting.is_translating
        };

        console.log('安全處理後的設定:', JSON.stringify(safeSettings, null, 2));

        const result = await db.prepare(`
            INSERT INTO language_settings 
            (context_id, context_type, primary_lang_a, primary_lang_b, secondary_lang_c, is_translating)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(context_id) DO UPDATE SET
                context_type = excluded.context_type,
                primary_lang_a = excluded.primary_lang_a,
                primary_lang_b = excluded.primary_lang_b,
                secondary_lang_c = excluded.secondary_lang_c,
                is_translating = excluded.is_translating,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            safeSettings.context_id,
            safeSettings.context_type,
            safeSettings.primary_lang_a,
            safeSettings.primary_lang_b,
            safeSettings.secondary_lang_c,
            safeSettings.is_translating ? 1 : 0
        ).run();

        console.log('設定儲存結果:', result);
        
        // 驗證設定是否成功儲存
        const saved = await getLanguageSetting(db, safeSettings.context_id, safeSettings.context_type);
        console.log('儲存後的設定:', JSON.stringify(saved, null, 2));
        
        if (!saved) {
            throw new Error('設定儲存失敗：無法讀取已儲存的設定');
        }
    } catch (error) {
        console.error('儲存語言設定時發生錯誤:', error);
        throw error;
    }
}

// 獲取語言設定
export async function getLanguageSetting(
    db: D1Database,
    contextId: string,
    contextType: string
): Promise<LanguageSetting | null> {
    try {
        const result = await db.prepare(`
            SELECT 
                context_id,
                context_type,
                primary_lang_a,
                primary_lang_b,
                secondary_lang_c,
                is_translating
            FROM language_settings 
            WHERE context_id = ? AND context_type = ?
        `).bind(contextId, contextType)
        .first();
        
        if (!result) return null;
        
        // 確保所有欄位都有值
        return {
            context_id: result.context_id,
            context_type: result.context_type || 'user',
            primary_lang_a: result.primary_lang_a || '',
            primary_lang_b: result.primary_lang_b || '',
            secondary_lang_c: result.secondary_lang_c || '',
            is_translating: result.is_translating === 1
        } as LanguageSetting;
    } catch (error) {
        console.error('獲取語言設定時發生錯誤:', error);
        throw error;
    }
}

// 更新主要語言A
export async function updatePrimaryLanguageA(
    db: D1Database,
    contextId: string,
    primaryLangA: string
): Promise<void> {
    try {
        const result = await db.prepare(`
            UPDATE language_settings
            SET primary_lang_a = ?, updated_at = CURRENT_TIMESTAMP
            WHERE context_id = ?
        `).bind(primaryLangA, contextId)
        .run();

        if (!result.success) {
            throw new Error('更新主要語言A失敗');
        }

        console.log('更新主要語言A成功:', { contextId, primaryLangA });
    } catch (error) {
        console.error('更新主要語言A時發生錯誤:', error);
        throw error;
    }
}

// 更新主要語言B
export async function updatePrimaryLanguageB(
    db: D1Database,
    contextId: string,
    primaryLangB: string
): Promise<void> {
    try {
        const result = await db.prepare(`
            UPDATE language_settings
            SET primary_lang_b = ?, updated_at = CURRENT_TIMESTAMP
            WHERE context_id = ?
        `).bind(primaryLangB, contextId)
        .run();

        if (!result.success) {
            throw new Error('更新主要語言B失敗');
        }

        console.log('更新主要語言B成功:', { contextId, primaryLangB });
    } catch (error) {
        console.error('更新主要語言B時發生錯誤:', error);
        throw error;
    }
}

// 更新次要語言C
export async function updateSecondaryLanguageC(
    db: D1Database,
    contextId: string,
    secondaryLangC: string | null
): Promise<void> {
    try {
        const result = await db.prepare(`
            UPDATE language_settings
            SET secondary_lang_c = ?, updated_at = CURRENT_TIMESTAMP
            WHERE context_id = ?
        `).bind(secondaryLangC, contextId)
        .run();

        if (!result.success) {
            throw new Error('更新次要語言C失敗');
        }

        console.log('更新次要語言C成功:', { contextId, secondaryLangC });
    } catch (error) {
        console.error('更新次要語言C時發生錯誤:', error);
        throw error;
    }
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
    `).bind(isTranslating ? 1 : 0, contextId)
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