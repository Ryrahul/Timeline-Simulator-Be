import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { AgentType } from '@prisma/client';

@Injectable()
export class SimulationService {
  private openai = new OpenAI();

  private agentPrompts = {
    MENTAL_HEALTH:
      'You are a mental health expert. Analyze the decision impact on emotional well-being. ' +
      'Respond ONLY with a JSON object containing "summary" (a concise paragraph) and "score" (a number 0-10). ' +
      'No additional text.',
    FINANCE:
      'You are a finance advisor. Analyze the financial implications of the decision. ' +
      'Respond ONLY with a JSON object containing "summary" (a concise paragraph) and "score" (a number 0-10). ' +
      'No additional text.',
    PERSONAL_GROWTH:
      'You are a personal growth coach. Analyze personal development aspects of the decision. ' +
      'Respond ONLY with a JSON object containing "summary" (a concise paragraph) and "score" (a number 0-10). ' +
      'No additional text.',
  };

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateSimulations(
    timelineId: string,
    questionText: string,
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
            content: `Decision context: "${questionText}"`,
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

          console.log(`Agent: ${agentKey}`);
          console.log('Summary:', summary);
          console.log('Score:', score);

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
  async generateTimelineSummary(timelineId: string, stylePrompt: string) {
    const simulations = await this.prisma.simulation.findMany({
      where: { timelineId },
    });

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${stylePrompt}  
        Using the following simulation summaries from different expert agents, create a clear and coherent timeline that outlines the progression and key impacts of the decision.  
        Integrate insights from all perspectives (mental health, finance, personal growth) to produce a concise narrative showing how the decision unfolds over time and its overall effects.  
        Respond with a well-structured summary suitable for a timeline format.
        `,
      },
      {
        role: 'user',
        content: simulations
          .map(
            (sim) =>
              `[${sim.agentType}]: ${sim.summary} (Score: ${(sim.score ?? 0).toFixed(1)})`,
          )
          .join('\n'),
      },
    ];

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
    });

    return completion?.choices[0]?.message?.content?.trim();
  }
}
