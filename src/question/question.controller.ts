import { Body, Controller, Post, Req, UsePipes } from '@nestjs/common';
import { QuestionService } from './question.service';
import { ForkTimelineDto, forkTimelineSchema } from './dto/fork-timeline.dto';
import { Public } from 'src/common/decorator/public-decorator';
import { ZodValidationPipe } from 'src/common/zod.pipe';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}
  @Post()
  async createQuestion(@Body('text') text: string, @Req() req) {
    return this.questionService.askQuestion(text, req.user.userId);
  }
  @Post('fork')
  @UsePipes(new ZodValidationPipe(forkTimelineSchema))
  async forkTimeline(@Body() dto: ForkTimelineDto) {
    return this.questionService.forkQuestion(dto);
  }
}
