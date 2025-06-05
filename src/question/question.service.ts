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
    await this.timelineService.forkTimeline(dto.parentTimelineId, dto.newText);
    const parentTimeline = await this.prisma.timeline.findUnique({
      where: { id: dto.parentTimelineId },
    });
    console.log('hereeeeeeeeee');
    return await this.prisma.question.findUnique({
      where: { id: parentTimeline?.questionId },
      include: {
        Timelines: {
          include: {
            simulation: true,
            forks: true,
          },
        },
      },
    });
  }
}
