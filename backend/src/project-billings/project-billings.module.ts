import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectBilling } from '../entities/project-billing.entity';
import { Project } from '../entities/project.entity';
import { ProjectBillingsService } from './project-billings.service';
import { ProjectBillingsController } from './project-billings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectBilling, Project])],
  controllers: [ProjectBillingsController],
  providers: [ProjectBillingsService],
})
export class ProjectBillingsModule {}
