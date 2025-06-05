// simulation.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SimulationService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSimulations(timelineId: string) {
    const agents = [
      {
        type: 'FINANCE',
        summary: 'Secured a tech job in Berlin with 2x salary growth.',
      },
      {
        type: 'MENTAL_HEALTH',
        summary: 'Faced initial homesickness, later adapted and felt happier.',
      },
      {
        type: 'PERSONAL_GROWTH',
        summary: 'Built a new friend circle, started traveling often.',
      },
    ];

    const created = await Promise.all(
      agents.map((agent) =>
        this.prisma.simulation.create({
          data: {
            timelineId,
            agentType: agent.type as any,
            summary: agent.summary,
            score: Math.random() * 10,
          },
        }),
      ),
    );

    return created;
  }
}
