import { Env, TranslationPair } from '../types';
import { CONFIG } from '../config';

interface TranslationResponse {
  targetLang: string;
  translatedText: string;
}

interface TranslationProvider {
  translate(text: string, targetLangs: string[], env: Env): Promise<TranslationPair[]>;
}

class DeepSeekTranslator implements TranslationProvider {
  async translate(text: string, targetLangs: string[], env: Env): Promise<TranslationPair[]> {
    try {
      const response = await fetch(`${CONFIG.DEEPSEEK_API_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          text,
          targetLangs
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json() as { translations: TranslationResponse[] };
      if (!data.translations || !Array.isArray(data.translations)) {
        throw new Error('Invalid response format from DeepSeek API');
      }

      return data.translations.map((t: TranslationResponse) => ({
        targetLang: t.targetLang,
        translatedText: t.translatedText
      }));
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }
}

// Groq 翻譯實現
class GroqTranslator implements TranslationProvider {
  async translate(text: string, targetLangs: string[], env: Env): Promise<TranslationPair[]> {
    try {
      const response = await fetch('https://api.groq.com/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          text,
          target_langs: targetLangs
        })
      });

      const data = await response.json() as TranslationResponse[];
      return data.map(item => ({
        targetLang: item.targetLang,
        translatedText: item.translatedText
      }));
    } catch (error) {
      console.error('Groq translation error:', error);
      return [];
    }
  }
}

// 根據配置選擇翻譯服務
export function createTranslator(): TranslationProvider {
  return new DeepSeekTranslator();
} 