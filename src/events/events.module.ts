import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [EventsGateway, EventsService],
  exports: [EventsService]
})
export class EventsModule {}



















