import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMetric } from '../entities/project-metric.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { MetricsService } from './metrics.service';
import { MetricsListener } from './metrics.listener';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMetric, Subcontract, MonthlyBilling])],
  providers: [MetricsService, MetricsListener],
  exports: [MetricsService],
})
export class MetricsModule {}
