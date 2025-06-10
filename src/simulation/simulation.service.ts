import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { AgentType } from '@prisma/client';
interface AgentResponse {
  summary: string;
  score: number;
}

interface TimelineSummaryResponse {
  summary: string;
  tldr: string;
}

@Injectable()
export class SimulationService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  private agentPrompts = {
    MENTAL_HEALTH: `You're a licensed mental health expert. Given a life decision, assess its 5-year impact on a person's mental wellbeing. 
Respond ONLY with this JSON format:
{
  "summary": "Detailed explanation (150-250 words)",
  "score": 1-10
}`,
    FINANCE: `You're a personal finance advisor. Evaluate a decision's 5-year impact on financial stability and growth.
Respond ONLY with this JSON:
{
  "summary": "Detailed explanation (150-250 words)",
  "score": 1-10
}`,
    PERSONAL_GROWTH: `You're a personal growth/life coach. Analyze how this decision affects personal development in 5 years.
Respond ONLY with this JSON:
{
  "summary": "Detailed explanation (150-250 words)",
  "score": 1-10
}`,
  };

  private styleUserContexts = {
    Optimistic:
      'You are chatting with a positive, hopeful user who wants uplifting advice.',
    Cautious:
      'You are chatting with a careful, detail-oriented user who prefers safe options.',
    Innovative:
      'You are chatting with a creative user who loves bold, original ideas.',
  };

  constructor(private prisma: PrismaService) {}

  async generateSimulations(
    timelineId: string,
    questionText: string,
    stylePrompt: string,
    style: string,
  ) {
    const combinedAgentPrompts = Object.entries(this.agentPrompts)
      .map(([agent, prompt]) => `### Agent: ${agent}\n${prompt}`)
      .join('\n\n');

    const userContext = this.styleUserContexts[style] || '';

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: `${stylePrompt}\n\n${combinedAgentPrompts}` },
      { role: 'user', content: userContext },
      { role: 'user', content: `Decision: "${questionText}"` },
      {
        role: 'user',
        content: `Please respond ONLY with a JSON object containing the keys MENTAL_HEALTH, FINANCE, PERSONAL_GROWTH, each having "summary" and "score" fields. Example:

{
  "MENTAL_HEALTH": { "summary": "...", "score": 7 },
  "FINANCE": { "summary": "...", "score": 5 },
  "PERSONAL_GROWTH": { "summary": "...", "score": 8 }
}
`,
      },
    ];

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });

    const raw = completion.choices[0].message?.content || '';
    let parsed: Record<string, AgentResponse> = {};

    try {
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error('JSON not found in OpenAI response');
      }

      const jsonString = raw.substring(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(jsonString) as Record<string, AgentResponse>;
    } catch (err) {
      console.error('Failed to parse JSON from OpenAI:', err);
      parsed = {};
    }
    if (Object.keys(parsed).length === 0) {
      console.warn(
        'Parsed result empty. Creating fallback simulation entry with default data.',
      );
      return this.prisma.simulation
        .create({
          data: {
            timelineId,
            summary:
              'Simulation generation failed or returned invalid data. Please try again.',
            score: 0,
            agentType: 'MENTAL_HEALTH',
          },
        })
        .then(() => []);
    }

    const promises = Object.entries(parsed).map(async ([agentKey, value]) => {
      const summary = value?.summary || '';
      const score = typeof value?.score === 'number' ? value.score : 5;

      return this.prisma.simulation.create({
        data: {
          timelineId,
          summary,
          score,
          agentType: agentKey as AgentType,
        },
      });
    });

    return Promise.all(promises);
  }

  async generateTimelineSummary(
    timelineId: string,
    stylePrompt: string,
  ): Promise<TimelineSummaryResponse> {
    const sims = await this.prisma.simulation.findMany({
      where: { timelineId },
    });

    const agentInsights = sims
      .map((sim) => {
        return `[${sim.agentType}]: ${sim.summary} (Score: ${(sim?.score ?? 0).toFixed(1)})`;
      })
      .join('\n\n');

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${stylePrompt}
  
  Given the three summaries below from agents (Mental Health, Finance, and Personal Growth), create a 5-year timeline showing yearly changes and impacts of the decision.
  
  Return your response in this exact XML format:
  
  <summary>
  Detailed year-by-year explanation (350-500 words)
  </summary>
  
  <tldr>
  3-6 lines summarizing key outcomes across years
  </tldr>
  
  Use natural formatting with line breaks. Do not include any other text.`,
      },
      {
        role: 'user',
        content: agentInsights,
      },
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000, 
      });

      const raw = completion.choices[0].message?.content?.trim() || '';

      if (!raw) {
        throw new Error('Empty response from OpenAI');
      }

      let parsed: TimelineSummaryResponse;

      try {
        parsed = this.parseXmlResponse(raw);
      } catch (error) {
        console.error('XML parsing failed, trying JSON fallback:', error);

        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid format found');
          }
        } catch (jsonError) {
          console.error('All parsing failed, using text extraction');
          parsed = this.extractContentFallback(raw);
        }
      }

      if (!parsed.summary || !parsed.tldr) {
        throw new Error('Parsed response missing required fields');
      }

      return {
        summary: parsed.summary,
        tldr: parsed.tldr,
      };
    } catch (error) {
      console.error('Timeline summary generation failed:', error);

      return {
        summary:
          'Timeline summary generation encountered an error. Please try again.',
        tldr: 'Summary generation failed due to parsing issues.',
      };
    }
  }

  private parseXmlResponse(raw: string): TimelineSummaryResponse {
    const summaryMatch = raw.match(/<summary>([\s\S]*?)<\/summary>/);
    const tldrMatch = raw.match(/<tldr>([\s\S]*?)<\/tldr>/);

    if (!summaryMatch || !tldrMatch) {
      throw new Error('Required XML tags not found');
    }

    return {
      summary: summaryMatch[1].trim(),
      tldr: tldrMatch[1].trim(),
    };
  }

  private extractContentFallback(raw: string): TimelineSummaryResponse {
    const summaryMatch =
      raw.match(/"summary":\s*"([^"]*(?:\\.[^"]*)*)"/) ||
      raw.match(/summary[^:]*:\s*([^,}]+)/i);
    const tldrMatch =
      raw.match(/"tldr":\s*"([^"]*(?:\\.[^"]*)*)"/) ||
      raw.match(/tldr[^:]*:\s*([^,}]+)/i);

    const summary = summaryMatch
      ? summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      : 'Timeline summary could not be extracted properly.';

    const tldr = tldrMatch
      ? tldrMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      : 'TLDR could not be extracted properly.';

    return { summary, tldr };
  }

  async generateSimulationsFromFork(
    timelineId: string,
    previousQuestion: string,
    previousSummary: string,
    newForkedQuestion: string,
    stylePrompt: string,
  ) {
    const agents = Object.entries(this.agentPrompts);

    const results = await Promise.all(
      agents.map(async ([agentKey, prompt]) => {
        const messages: ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: `${stylePrompt} ${prompt}`,
          },
          {
            role: 'user',
            content: `You are continuing from a previous life decision analysis.

  This is a fork of a previous decision timeline.

  Previous decision question: "${previousQuestion}"
  Previous timeline summary: """${previousSummary}"""

  Now consider this new question or decision update:
  "${newForkedQuestion}"

  Please analyze this new decision in the context of the previous timeline.

  Respond ONLY with a JSON object containing "summary" and "score".`,
          },
        ];

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages,
          temperature: 0.7,
        });

        const rawResponse = completion.choices[0].message.content;
        if (!rawResponse) {
          console.error(
            `No content returned from OpenAI for agent ${agentKey}`,
          );
          return null;
        }

        try {
          const jsonStart = rawResponse.indexOf('{');
          const jsonEnd = rawResponse.lastIndexOf('}');
          if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
            throw new Error('JSON not found or malformed in response');
          }

          const jsonString = rawResponse.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonString);

          const summary = parsed.summary ?? parsed.Summary ?? '';
          const score = parsed.score ?? parsed.Score ?? 0;

          const simulations = await this.prisma.simulation.create({
            data: {
              timelineId,
              summary,
              agentType: agentKey as AgentType,
              score,
            },
          });

          return simulations;
        } catch (error) {
          console.error(`Failed to parse JSON from agent ${agentKey}:`, error);
          console.log('Raw response:', rawResponse);
          return null;
        }
      }),
    );

    return results.filter((r) => r !== null);
  }
}
