import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SimulationService } from 'src/simulation/simulation.service';

@Injectable()
export class TimelineService {
  private readonly styles = ['Optimistic', 'Cautious', 'Innovative'];
  private readonly stylePrompts = {
    Optimistic:
      'You are an optimistic advisor who focuses on positive outcomes.',
    Cautious:
      'You are a cautious analyst who highlights risks and safer paths.',
    Innovative:
      'You are an innovative thinker who values creative, bold outcomes.',
  };
  constructor(
    private readonly prisma: PrismaService,
    private readonly simulationService: SimulationService,
  ) {}

  async generateTimelines(questionId: string, text: string) {
    for (const style of this.styles) {
      const timeline = await this.prisma.timeline.create({
        data: {
          questionId,
          summary: '',
        },
      });

      await this.simulationService.generateSimulations(
        timeline.id,
        text,
        this.stylePrompts[style],
      );
      const timelineSummary =
        await this.simulationService.generateTimelineSummary(
          timeline.id,
          this.stylePrompts[style],
        );
      await this.prisma.timeline.update({
        where: { id: timeline.id },
        data: { summary: timelineSummary },
      });
    }
  }
}
