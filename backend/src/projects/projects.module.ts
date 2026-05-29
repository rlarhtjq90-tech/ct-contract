import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMetric } from '../entities/project-metric.entity';
import { ContractChange } from '../entities/contract-change.entity';
import { ProjectBilling } from '../entities/project-billing.entity';
import { DeleteRequest } from '../entities/delete-request.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMetric, ContractChange, ProjectBilling, DeleteRequest, Subcontract, MonthlyBilling])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
