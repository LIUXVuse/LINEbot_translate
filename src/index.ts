import { Env } from './types';
import { handleMessage } from './handlers/messageHandler';
import { handlePostback } from './handlers/postbackHandler';
import { verifySignature } from './utils/lineSignature';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            const signature = request.headers.get('x-line-signature');
            if (!signature) {
                return new Response('Signature required', { status: 401 });
            }

            const body = await request.text();
            console.log('收到的請求內容:', body);

            const isValid = await verifySignature(body, signature, env.LINE_CHANNEL_SECRET);
            console.log('計算的簽名:', isValid);
            console.log('收到的簽名:', signature);

            if (!isValid) {
                return new Response('Invalid signature', { status: 401 });
            }

            const data = JSON.parse(body);
            const events = data.events;

            if (!events || events.length === 0) {
                return new Response('No events', { status: 200 });
            }

            const responses = await Promise.all(
                events.map(async (event) => {
                    console.log('處理事件:', event.type);

                    let messages;
                    if (event.type === 'message') {
                        messages = await handleMessage(event, env);
                    } else if (event.type === 'postback') {
                        messages = await handlePostback(event, env);
                    }

                    if (messages && messages.length > 0) {
                        console.log('準備發送翻譯結果:', messages);
                        await fetch('https://api.line.me/v2/bot/message/reply', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
                            },
                            body: JSON.stringify({
                                replyToken: event.replyToken,
                                messages: messages
                            })
                        });
                    }
                })
            );

            return new Response('Ok', { status: 200 });
        } catch (error) {
            console.error('處理請求時發生錯誤:', error);
            return new Response('Internal server error', { status: 500 });
        }
    }
}; 