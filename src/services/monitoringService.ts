import { Env } from '../types';

interface TranslationLog {
    timestamp: string;
    source_lang: string;
    target_langs: string[];
    char_count: number;
    success: boolean;
    error?: string;
}

interface TranslationStats {
    total_requests: number;
    success_rate: number;
    total_chars: number;
    avg_chars_per_request: number;
}

interface DBQueryResult {
    total_requests: number;
    success_rate: number;
    total_chars: number;
    avg_chars_per_request: number;
}

export class MonitoringService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    async logTranslation(log: TranslationLog): Promise<void> {
        try {
            const stmt = this.env.DB.prepare(`
                INSERT INTO translation_logs (
                    timestamp,
                    source_lang,
                    target_langs,
                    char_count,
                    success,
                    error
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);

            await stmt.bind(
                log.timestamp,
                log.source_lang,
                JSON.stringify(log.target_langs),
                log.char_count,
                log.success ? 1 : 0,
                log.error || null
            ).run();

            console.log('翻譯記錄已保存:', log);
        } catch (error) {
            console.error('保存翻譯記錄時發生錯誤:', error);
        }
    }

    async getTranslationStats(period: 'day' | 'week' | 'month'): Promise<TranslationStats> {
        const timeFilter = {
            day: "datetime('now', '-1 day')",
            week: "datetime('now', '-7 days')",
            month: "datetime('now', '-30 days')"
        }[period];

        const result = await this.env.DB.prepare(`
            SELECT 
                COUNT(*) as total_requests,
                AVG(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100 as success_rate,
                SUM(char_count) as total_chars,
                AVG(char_count) as avg_chars_per_request
            FROM translation_logs
            WHERE timestamp >= ${timeFilter}
        `).first<DBQueryResult>();

        if (!result) {
            return {
                total_requests: 0,
                success_rate: 0,
                total_chars: 0,
                avg_chars_per_request: 0
            };
        }

        return {
            total_requests: result.total_requests || 0,
            success_rate: result.success_rate || 0,
            total_chars: result.total_chars || 0,
            avg_chars_per_request: result.avg_chars_per_request || 0
        };
    }

    async logError(errorDetails: {
        timestamp: string;
        errorType: string;
        errorMessage: string;
        stackTrace?: string;
        inputText?: string;
        targetLanguages?: string[];
    }): Promise<void> {
        try {
            await this.env.DB.prepare(
                `INSERT INTO error_logs 
                (timestamp, error_type, error_message, stack_trace, input_text, target_languages)
                VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(
                errorDetails.timestamp,
                errorDetails.errorType,
                errorDetails.errorMessage,
                errorDetails.stackTrace || '',
                errorDetails.inputText || '',
                errorDetails.targetLanguages?.join(',') || ''
            ).run();
        } catch (error) {
            console.error('記錄錯誤日誌失敗:', error);
        }
    }

    async logApiError(apiName: string, errorDetails: {
        statusCode: number;
        errorMessage: string;
        requestUrl: string;
        requestBody: string;
    }): Promise<void> {
        try {
            await this.env.DB.prepare(
                `INSERT INTO api_error_logs 
                (timestamp, api_name, status_code, error_message, request_url, request_body)
                VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(
                new Date().toISOString(),
                apiName,
                errorDetails.statusCode,
                errorDetails.errorMessage,
                errorDetails.requestUrl,
                errorDetails.requestBody
            ).run();
        } catch (error) {
            console.error('記錄 API 錯誤日誌失敗:', error);
        }
    }
} 