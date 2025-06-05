import { Body, Controller, Post, Req } from '@nestjs/common';
import { QuestionService } from './question.service';
import { ForkTimelineDto } from './dto/fork-timeline.dto';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}
  @Post()
  async createQuestion(@Body('text') text: string, @Req() req) {
    return this.questionService.askQuestion(text, req.user.userId);
  }
  @Post('fork')
  async forkTimeline(@Body() dto: ForkTimelineDto) {
    return this.questionService.forkQuestion(dto);
  }
}
