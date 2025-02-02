import { handleLineWebhook } from './handlers/lineHandler';
import { Env } from './types';

interface RequestBody {
    contextId?: string;
    groupId?: string;
    primaryLang?: string;
    secondaryLang?: string;
    contextType?: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        
        // 更新 CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        };

        // 處理 OPTIONS 請求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    ...corsHeaders,
                    'Allow': 'GET, POST, OPTIONS',
                }
            });
        }
        
        // 處理 LINE Webhook
        if (url.pathname === '/webhook') {
            return handleLineWebhook(request, env);
        }
        
        // 處理語言設定
        if (url.pathname === '/api/settings' && request.method === 'POST') {
            try {
                const body = await request.json() as RequestBody;
                console.log('Received request body:', body);

                // 支援舊的 groupId 格式
                const contextId = body.contextId || body.groupId;
                const { primaryLang, secondaryLang, contextType } = body;
                
                if (!primaryLang || !contextId) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '缺少必要欄位',
                        details: { primaryLang, contextId }
                    }), { 
                        status: 400,
                        headers: corsHeaders
                    });
                }

                // 儲存到 D1 資料庫
                try {
                    const result = await env.DB.prepare(`
                        INSERT INTO language_settings (context_id, context_type, primary_lang, secondary_lang)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(context_id) DO UPDATE SET
                        primary_lang = excluded.primary_lang,
                        secondary_lang = excluded.secondary_lang,
                        context_type = excluded.context_type,
                        updated_at = CURRENT_TIMESTAMP
                    `).bind(
                        contextId,
                        contextType || 'group',
                        primaryLang,
                        secondaryLang || null
                    ).run();

                    console.log('Database operation parameters:', {
                        contextId,
                        contextType: contextType || 'group',
                        primaryLang,
                        secondaryLang: secondaryLang || null
                    });
                    console.log('Database operation result:', result);
                    
                    return new Response(JSON.stringify({ 
                        success: true,
                        message: '設定已儲存'
                    }), { 
                        status: 200,
                        headers: corsHeaders
                    });
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : '未知資料庫錯誤';
                    console.error('Database error:', error);
                    console.error('Error details:', errorMessage);
                    throw error;
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : '未知錯誤';
                console.error('Error processing request:', error);
                return new Response(JSON.stringify({ 
                    success: false,
                    error: '處理請求時發生錯誤',
                    details: errorMessage 
                }), { 
                    status: 500,
                    headers: corsHeaders
                });
            }
        }
        
        return new Response('Not found', { 
            status: 404,
            headers: corsHeaders
        });
    },
}; 