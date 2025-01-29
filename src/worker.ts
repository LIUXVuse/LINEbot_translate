import { handleLineWebhook } from './handlers/lineHandler';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            // 基礎路由處理
            if (request.method === 'POST' && request.url.endsWith('/webhook')) {
                return await handleLineWebhook(request, env);
            }
            
            return new Response('LINE Translate Bot is running!');
        } catch (error) {
            console.error('Worker error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
} 