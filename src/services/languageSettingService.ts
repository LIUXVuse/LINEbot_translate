import { D1Database } from '@cloudflare/workers-types';

export interface LanguageSetting {
    context_id: string;
    context_type: string;
    primary_lang_a: string;
    primary_lang_b: string;
    secondary_lang_c?: string;
    is_translating: boolean;
}

// 獲取語言設定
export async function getLanguageSetting(
    db: D1Database,
    contextId: string,
    contextType: string
): Promise<LanguageSetting | null> {
    const result = await db.prepare(
        'SELECT * FROM language_settings WHERE context_id = ? AND context_type = ?'
    ).bind(contextId, contextType).first();
    
    return result as LanguageSetting | null;
}

// 儲存語言設定
export async function saveLanguageSetting(
    db: D1Database,
    setting: LanguageSetting
): Promise<void> {
    await db.prepare(`
        INSERT INTO language_settings (
            context_id, 
            context_type, 
            primary_lang_a, 
            primary_lang_b, 
            secondary_lang_c, 
            is_translating
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(context_id, context_type) DO UPDATE SET
            primary_lang_a = excluded.primary_lang_a,
            primary_lang_b = excluded.primary_lang_b,
            secondary_lang_c = excluded.secondary_lang_c,
            is_translating = excluded.is_translating
    `).bind(
        setting.context_id,
        setting.context_type,
        setting.primary_lang_a,
        setting.primary_lang_b,
        setting.secondary_lang_c,
        setting.is_translating ? 1 : 0
    ).run();
}

// 更新主要語言A
export async function updatePrimaryLanguageA(
    db: D1Database,
    contextId: string,
    lang: string
): Promise<void> {
    await db.prepare(
        'UPDATE language_settings SET primary_lang_a = ? WHERE context_id = ?'
    ).bind(lang, contextId).run();
}

// 更新主要語言B
export async function updatePrimaryLanguageB(
    db: D1Database,
    contextId: string,
    lang: string
): Promise<void> {
    await db.prepare(
        'UPDATE language_settings SET primary_lang_b = ? WHERE context_id = ?'
    ).bind(lang, contextId).run();
}

// 更新次要語言C
export async function updateSecondaryLanguageC(
    db: D1Database,
    contextId: string,
    lang: string
): Promise<void> {
    await db.prepare(
        'UPDATE language_settings SET secondary_lang_c = ? WHERE context_id = ?'
    ).bind(lang, contextId).run();
}

// 切換翻譯狀態
export async function toggleTranslation(
    db: D1Database,
    contextId: string,
    enable: boolean
): Promise<void> {
    await db.prepare(
        'UPDATE language_settings SET is_translating = ? WHERE context_id = ?'
    ).bind(enable ? 1 : 0, contextId).run();
}

// 刪除語言設定
export async function deleteLanguageSetting(
    db: D1Database,
    contextId: string
): Promise<void> {
    await db.prepare(
        'DELETE FROM language_settings WHERE context_id = ?'
    ).bind(contextId).run();
} 