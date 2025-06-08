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
        data: { questionId, summary: '', tldr: '' },
      });

      await this.simulationService.generateSimulations(
        timeline.id,
        text,
        this.stylePrompts[style],
        style,
      );

      const { summary, tldr } =
        await this.simulationService.generateTimelineSummary(
          timeline.id,
          this.stylePrompts[style],
        );

      await this.prisma.timeline.update({
        where: { id: timeline.id },
        data: { summary, tldr },
      });
    }
  }

  async forkTimeline(parentTimelineId: string, userInput: string) {
    const parentTimeline = await this.prisma.timeline.findUnique({
      where: { id: parentTimelineId },
      include: { question: true },
    });

    if (!parentTimeline || !parentTimeline.question) {
      throw new Error('Parent timeline or question not found');
    }

    for (const style of this.styles) {
      const timeline = await this.prisma.timeline.create({
        data: {
          questionId: parentTimeline.question.id,
          forkedFromId: parentTimeline.id,
          summary: '',
        },
      });

      await this.simulationService.generateSimulationsFromFork(
        timeline.id,
        parentTimeline.question.text,
        parentTimeline.summary,
        userInput,
        this.styles[style],
      );

      const { summary, tldr } =
        await this.simulationService.generateTimelineSummary(
          timeline.id,
          this.stylePrompts[style],
        );

      await this.prisma.timeline.update({
        where: { id: timeline.id },
        data: { summary: summary, tldr },
      });
    }
  }
}
