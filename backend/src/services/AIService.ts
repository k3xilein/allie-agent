// AI Service (OpenRouter Integration)
import axios from 'axios';
import { TradeDecision, MarketData } from '../models/types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class AIService {
  private apiKey: string;
  private model: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
  }

  async analyzeMarket(
    marketData: MarketData,
    currentPosition: any,
    accountBalance: number
  ): Promise<TradeDecision> {
    try {
      if (!this.apiKey) {
        logger.warn('OpenRouter API key not configured, using fallback');
        return this.getFallbackDecision();
      }

      const prompt = this.buildPrompt(marketData, currentPosition, accountBalance);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      const decision = this.parseResponse(aiResponse);

      logger.info('AI analysis completed', { decision: decision.action });
      return decision;
    } catch (error) {
      logger.error('AI analysis failed', { error });
      return this.getFallbackDecision();
    }
  }

  private getSystemPrompt(): string {
    return `You are a professional cryptocurrency trading analyst specializing in Bitcoin/USDT.
Your role is to analyze market data and provide clear, actionable trading decisions.

Rules:
- Be conservative: Only recommend trades with high confidence
- Prioritize capital preservation over aggressive gains
- Learn from past mistakes (provided in context)
- Never recommend trades that repeat historical errors
- Always provide detailed reasoning for your decisions

Response Format (STRICT):
ACTION: [OPEN_LONG | OPEN_SHORT | CLOSE | HOLD]
REASONING: [Your detailed analysis]
CONFIDENCE: [0-100]
SUGGESTED_SIZE: [Position size in USDT, 0 if HOLD/CLOSE]
STRATEGY: [Trend Following | Mean Reversion | Breakout Trading]`;
  }

  private buildPrompt(
    marketData: MarketData,
    currentPosition: any,
    accountBalance: number
  ): string {
    return `Current Market Analysis Request:

Symbol: ${marketData.symbol}
Current Price: $${marketData.currentPrice.toFixed(2)}
Account Balance: $${accountBalance.toFixed(2)}

Technical Indicators:
- RSI(14): ${marketData.indicators?.rsi?.toFixed(2) || 'N/A'}
- MACD: ${marketData.indicators?.macd ? `${marketData.indicators.macd.value.toFixed(2)}` : 'N/A'}
- Bollinger Bands: Upper $${marketData.indicators?.bollingerBands?.upper || 'N/A'}, Lower $${marketData.indicators?.bollingerBands?.lower || 'N/A'}

Current Position: ${currentPosition ? `${currentPosition.side} - Entry: $${currentPosition.entry_price}` : 'None'}

Please provide your trading decision following the exact format specified in the system prompt.`;
  }

  private parseResponse(aiResponse: string): TradeDecision {
    try {
      const lines = aiResponse.split('\n');
      const decision: Partial<TradeDecision> = {};

      for (const line of lines) {
        if (line.startsWith('ACTION:')) {
          const action = line.split(':')[1].trim();
          decision.action = action as any;
        } else if (line.startsWith('REASONING:')) {
          decision.reasoning = line.split(':')[1].trim();
        } else if (line.startsWith('CONFIDENCE:')) {
          decision.confidence = parseInt(line.split(':')[1].trim());
        } else if (line.startsWith('SUGGESTED_SIZE:')) {
          decision.suggestedSize = parseFloat(line.split(':')[1].trim());
        } else if (line.startsWith('STRATEGY:')) {
          decision.strategy = line.split(':')[1].trim();
        }
      }

      // Validate
      if (!decision.action || !decision.reasoning || !decision.confidence || decision.suggestedSize === undefined) {
        throw new Error('Incomplete AI response');
      }

      return decision as TradeDecision;
    } catch (error) {
      logger.error('Failed to parse AI response', { error, aiResponse });
      return this.getFallbackDecision();
    }
  }

  private getFallbackDecision(): TradeDecision {
    return {
      action: 'HOLD',
      reasoning: 'AI service unavailable or error occurred. Defaulting to HOLD for safety.',
      confidence: 0,
      suggestedSize: 0,
      strategy: 'Safety Protocol',
    };
  }
}

export const aiService = new AIService();
