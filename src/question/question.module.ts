import { Module } from '@nestjs/common';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { TimelineService } from 'src/timeline/timeline.service';
import { SimulationService } from 'src/simulation/simulation.service';
import { TimelineModule } from 'src/timeline/timeline.module';
import { SimulationModule } from 'src/simulation/simulation.module';

@Module({
  imports: [TimelineModule, SimulationModule],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule {}
