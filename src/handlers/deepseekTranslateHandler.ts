// 新增翻譯結果格式驗證函式
function validateTranslationResponse(response: any): boolean {
  return (
    Array.isArray(response) &&
    response.every((item: any) => 
      item.targetLang && 
      item.translatedText &&
      typeof item.targetLang === 'string' &&
      typeof item.translatedText === 'string'
    )
  );
}

// 新增 fetchGroqAPI 函式
async function fetchGroqAPI(text: string, targetLangs: string[]): Promise<any> {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-ai',
                messages: [
                    {
                        role: 'system',
                        content: '你是一位專業翻譯員，只需輸出翻譯結果'
                    },
                    {
                        role: 'user',
                        content: `將以下文字翻譯成 ${targetLangs.join(', ')}：${text}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('fetchGroqAPI 錯誤:', error);
        throw error;
    }
}

// 修改翻譯處理流程
export async function handleDeepSeekTranslation(text: string, targetLangs: string[]): Promise<Array<{targetLang: string, translatedText: string}>> {
    try {
        // 新增輸入驗證
        if (typeof text !== 'string' || text.length === 0) {
            throw new Error('Invalid input text');
        }

        const sanitizedText = text.slice(0, 1000);
        const response = await fetchGroqAPI(sanitizedText, targetLangs);

        // 驗證回應格式
        if (!validateTranslationResponse(response)) {
            throw new Error('Invalid translation response format');
        }

        return response.map((item: any) => ({
            targetLang: String(item.targetLang || 'und').slice(0, 5),
            translatedText: String(item.translatedText || '').trim().slice(0, 2000)
        }));

    } catch (error) {
        console.error('DeepSeek 翻譯處理失敗:', error);
        return [{
            targetLang: 'error',
            translatedText: '翻譯服務暫時不可用，請稍後再試'
        }];
    }
} 