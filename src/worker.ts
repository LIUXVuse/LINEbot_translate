import { handleLineWebhook } from './handlers/lineHandler';
import { Env } from './types';

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
                const body = await request.json();
                const { primaryLang, secondaryLang, groupId } = body;
                
                console.log('Received settings:', { primaryLang, secondaryLang, groupId });

                if (!primaryLang || !groupId) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Missing required fields'
                    }), { 
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json'
                        }
                    });
                }
                
                // 儲存到 D1 資料庫
                const result = await env.DB.prepare(`
                    INSERT INTO language_settings (group_id, primary_lang, secondary_lang)
                    VALUES (?, ?, ?)
                    ON CONFLICT(group_id) DO UPDATE SET
                    primary_lang = excluded.primary_lang,
                    secondary_lang = excluded.secondary_lang,
                    updated_at = CURRENT_TIMESTAMP
                `).bind(groupId, primaryLang, secondaryLang || null).run();

                console.log('Database result:', result);
                
                return new Response(JSON.stringify({ 
                    success: true,
                    message: '設定已儲存'
                }), { 
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error saving settings:', error);
                return new Response(JSON.stringify({ 
                    success: false,
                    error: 'Error saving settings',
                    details: error.message 
                }), { 
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    }
                });
            }
        }
        
        return new Response('Not found', { 
            status: 404,
            headers: corsHeaders
        });
    },
}; 