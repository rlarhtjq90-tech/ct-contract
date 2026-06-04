import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlySnapshot } from '../entities/monthly-snapshot.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { ProjectBilling } from '../entities/project-billing.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthlySnapshot,
      Project,
      Subcontract,
      ProjectBilling,
      MonthlyBilling,
    ]),
  ],
  controllers: [SnapshotsController],
  providers: [SnapshotsService],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
