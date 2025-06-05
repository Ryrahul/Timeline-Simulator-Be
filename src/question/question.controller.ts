import { Body, Controller, Post, Req } from '@nestjs/common';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}
  @Post()
  async createQuestion(@Body('text') text: string, @Req() req) {
    return this.questionService.askQuestion(text, req.user.userId);
  }
}
