import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { SimulationModule } from 'src/simulation/simulation.module';
import { SimulationService } from 'src/simulation/simulation.service';

@Module({
  imports: [SimulationModule],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
