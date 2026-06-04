import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { ProjectBilling } from '../entities/project-billing.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { ContractChange } from '../entities/contract-change.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Subcontract, ProjectBilling, MonthlyBilling, ContractChange]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
