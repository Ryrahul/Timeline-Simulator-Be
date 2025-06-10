import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TimelineService } from 'src/timeline/timeline.service';
import { ForkTimelineDto } from './dto/fork-timeline.dto';

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
  async forkQuestion(dto: ForkTimelineDto) {
    console.log(dto.parentTimelineId);

    await this.timelineService.forkTimeline(dto.parentTimelineId, dto.newText);

    const parentTimeline = await this.prisma.timeline.findUnique({
      where: { id: dto.parentTimelineId },
    });

    const fullQuestion = await this.prisma.question.findUnique({
      where: { id: parentTimeline?.questionId },
      include: {
        Timelines: {
          include: {
            simulation: true,
            forks: {
              include: {
                simulation: true,
                forks: {
                  include: {
                    simulation: true,
                    forks: true, // Continue nesting if needed
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!fullQuestion) {
      throw new Error('Question not found');
    }

    // ✅ Filter only root-level timelines (forkedFromId === null)
    const rootOnlyQuestion = {
      ...fullQuestion,
      Timelines: fullQuestion.Timelines.filter((t) => t.forkedFromId === null),
    };

    return rootOnlyQuestion;
  }
}
