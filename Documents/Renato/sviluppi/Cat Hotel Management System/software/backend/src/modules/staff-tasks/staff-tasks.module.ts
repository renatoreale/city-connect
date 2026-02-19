import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffTaskType } from './entities/staff-task-type.entity';
import { StaffTask } from './entities/staff-task.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { StaffTasksService } from './staff-tasks.service';
import { StaffTaskTypesController, StaffTasksController } from './staff-tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffTaskType, StaffTask, Booking]),
  ],
  controllers: [StaffTaskTypesController, StaffTasksController],
  providers: [StaffTasksService],
  exports: [StaffTasksService],
})
export class StaffTasksModule {}
