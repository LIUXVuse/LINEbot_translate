import { D1Database } from '@cloudflare/workers-types';

// 定義語言設定介面
export interface LanguageSetting {
    context_id: string;
    context_type: string;
    primary_lang_a: string | null;
    primary_lang_b: string | null;
    secondary_lang_c: string | null;
    is_translating: boolean;
}

// 儲存語言設定
export async function saveLanguageSetting(
    setting: LanguageSetting,
    db: D1Database
): Promise<void> {
    try {
        const result = await db
            .prepare(
                `INSERT INTO language_settings 
                 (context_id, context_type, primary_lang_a, primary_lang_b, secondary_lang_c, is_translating)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(context_id, context_type) DO UPDATE SET
                 primary_lang_a = excluded.primary_lang_a,
                 primary_lang_b = excluded.primary_lang_b,
                 secondary_lang_c = excluded.secondary_lang_c,
                 is_translating = excluded.is_translating`
            )
            .bind(
                setting.context_id,
                setting.context_type,
                setting.primary_lang_a,
                setting.primary_lang_b,
                setting.secondary_lang_c,
                setting.is_translating ? 1 : 0
            )
            .run();

        console.log('設定儲存結果:', result);
    } catch (error) {
        console.error('儲存語言設定時發生錯誤:', error);
        throw error;
    }
}

// 獲取語言設定
export async function getLanguageSetting(
    contextId: string,
    contextType: string,
    db: D1Database
): Promise<LanguageSetting | null> {
    try {
        const result = await db
            .prepare(
                `SELECT * FROM language_settings 
                 WHERE context_id = ? AND context_type = ?`
            )
            .bind(contextId, contextType)
            .first<LanguageSetting>();
        
        return result || null;
    } catch (error) {
        console.error('獲取語言設定時發生錯誤:', error);
        throw error;
    }
}

// 更新主要語言A
export async function updatePrimaryLanguageA(
    contextId: string,
    contextType: string,
    lang: string,
    db: D1Database
): Promise<void> {
    try {
        console.log(`正在更新主要語言A: contextId=${contextId}, contextType=${contextType}, lang=${lang}`);
        const setting = await getLanguageSetting(contextId, contextType, db);
        if (setting) {
            setting.primary_lang_a = lang;
            await saveLanguageSetting(setting, db);
            console.log('成功更新主要語言A');
        } else {
            const newSetting: LanguageSetting = {
                context_id: contextId,
                context_type: contextType,
                primary_lang_a: lang,
                primary_lang_b: null,
                secondary_lang_c: null,
                is_translating: true
            };
            await saveLanguageSetting(newSetting, db);
            console.log('成功創建新的語言設定並設定主要語言A');
        }
    } catch (error) {
        console.error('更新主要語言A時發生錯誤:', error);
        throw error;
    }
}

// 更新主要語言B
export async function updatePrimaryLanguageB(
    contextId: string,
    contextType: string,
    lang: string,
    db: D1Database
): Promise<void> {
    try {
        console.log(`正在更新主要語言B: contextId=${contextId}, contextType=${contextType}, lang=${lang}`);
        const setting = await getLanguageSetting(contextId, contextType, db);
        if (setting) {
            setting.primary_lang_b = lang;
            await saveLanguageSetting(setting, db);
            console.log('成功更新主要語言B');
        } else {
            const newSetting: LanguageSetting = {
                context_id: contextId,
                context_type: contextType,
                primary_lang_a: null,
                primary_lang_b: lang,
                secondary_lang_c: null,
                is_translating: true
            };
            await saveLanguageSetting(newSetting, db);
            console.log('成功創建新的語言設定並設定主要語言B');
        }
    } catch (error) {
        console.error('更新主要語言B時發生錯誤:', error);
        throw error;
    }
}

// 更新次要語言C
export async function updateSecondaryLanguageC(
    contextId: string,
    contextType: string,
    lang: string | null,
    db: D1Database
): Promise<void> {
    try {
        console.log(`正在更新次要語言C: contextId=${contextId}, contextType=${contextType}, lang=${lang}`);
        const setting = await getLanguageSetting(contextId, contextType, db);
        if (setting) {
            setting.secondary_lang_c = lang;
            await saveLanguageSetting(setting, db);
            console.log('成功更新次要語言C');
        } else {
            const newSetting: LanguageSetting = {
                context_id: contextId,
                context_type: contextType,
                primary_lang_a: null,
                primary_lang_b: null,
                secondary_lang_c: lang,
                is_translating: true
            };
            await saveLanguageSetting(newSetting, db);
            console.log('成功創建新的語言設定並設定次要語言C');
        }
    } catch (error) {
        console.error('更新次要語言C時發生錯誤:', error);
        throw error;
    }
}

// 切換翻譯狀態
export async function toggleTranslation(
    contextId: string,
    contextType: string,
    db: D1Database
): Promise<boolean> {
    try {
        const setting = await getLanguageSetting(contextId, contextType, db);
        if (setting) {
            setting.is_translating = !setting.is_translating;
            await saveLanguageSetting(setting, db);
            return setting.is_translating;
        }
        return false;
    } catch (error) {
        console.error('切換翻譯狀態時發生錯誤:', error);
        throw error;
    }
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