import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Module({
  providers: [TimelineService]
})
export class TimelineModule {}
