import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SimulationService } from 'src/simulation/simulation.service';

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simulationService: SimulationService,
  ) {}

  async generateTimelines(questionId: string, text: string) {
    const baseSummaries = [
      'You moved abroad and advanced your career rapidly.',
      'You stayed and grew slowly but steadily in your comfort zone.',
      'You tried moving but returned within a year due to cultural mismatch.',
    ];

    const timelines = await Promise.all(
      baseSummaries.map(async (summary) => {
        const timeline = await this.prisma.timeline.create({
          data: {
            questionId,
            summary,
          },
        });

        const simulations = await this.simulationService.generateSimulations(
          timeline.id,
        );

        const agents = simulations.map((sim) => ({
          agent: sim.agentType,
          summary: sim.summary,
        }));

        return {
          id: timeline.id,
          summary: timeline.summary,
          agents,
        };
      }),
    );

    return {
      question: text,
      timelines,
    };
  }
}
