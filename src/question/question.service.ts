import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TimelineService } from 'src/timeline/timeline.service';
import { ForkTimelineDto } from './dto/fork-timeline.dto';
import {
  QuestionWithTimelines,
  TimelineWithForksAndSimulations,
} from 'src/common/types';

@Injectable()
export class QuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
  ) {}

  async askQuestion(text: string, userId: string) {
    const question = await this.prisma.question.create({
      data: {
        text,
        userId,
      },
    });

    await this.timelineService.generateTimelines(question.id, question.text);

    return this.prisma.question.findUnique({
      where: { id: question.id },
      include: {
        Timelines: {
          include: {
            simulation: true,
          },
        },
      },
    });
  }
  async forkQuestion(dto: ForkTimelineDto): Promise<QuestionWithTimelines> {

    await this.timelineService.forkTimeline(dto.parentTimelineId, dto.newText);

    const parentTimeline = await this.prisma.timeline.findUnique({
      where: { id: dto.parentTimelineId },
    });

    if (!parentTimeline) throw new Error('Parent timeline not found');

    const question = await this.prisma.question.findUnique({
      where: { id: parentTimeline.questionId },
    });

    if (!question) throw new Error('Question not found');

    const rootTimelines = await this.prisma.timeline.findMany({
      where: {
        questionId: question.id,
        forkedFromId: null,
      },
      include: {
        simulation: true,
      },
    });

    const attachForks = async (
      timeline: TimelineWithForksAndSimulations,
    ): Promise<any> => {
      const forks = await this.prisma.timeline.findMany({
        where: { forkedFromId: timeline.id },
        include: {
          simulation: true,
        },
      });

      if (forks.length > 0) {
        timeline.forks = await Promise.all(forks.map(attachForks));
      }

      return timeline;
    };

    const fullTimelines = await Promise.all(rootTimelines.map(attachForks));

    return {
      ...question,
      Timelines: fullTimelines,
    };
  }

  async getQuestions(userId: string) {
    const questions = await this.prisma.question.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        Timelines: {
          select: {
            summary: true,
            tldr: true,
            simulation: true,
            createdAt: true,
          },
        },
      },
    });

    return questions;
  }

  async getQuestionById(id: string): Promise<QuestionWithTimelines> {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const rawTimelines = await this.prisma.timeline.findMany({
      where: {
        questionId: question.id,
        forkedFromId: null,
      },
      include: {
        simulation: true,
      },
    });

    const attachForks = async (
      timeline: TimelineWithForksAndSimulations,
    ): Promise<TimelineWithForksAndSimulations> => {
      const forks = await this.prisma.timeline.findMany({
        where: { forkedFromId: timeline.id },
        include: {
          simulation: true,
        },
      });

      if (forks.length > 0) {
        timeline.forks = await Promise.all(forks.map((f) => attachForks(f)));
      }

      return timeline;
    };

    const fullTimelines = await Promise.all(
      rawTimelines.map((t) => attachForks(t)),
    );

    return {
      ...question,
      Timelines: fullTimelines,
    };
  }
}
