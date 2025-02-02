import { Env } from './types';
import { handleLineWebhook } from './handlers/lineHandler';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        try {
            if (request.method === 'POST') {
                return await handleLineWebhook(request, env);
            }
            
            return new Response('OK', { status: 200 });
        } catch (error) {
            console.error('處理請求時發生錯誤:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
}; 