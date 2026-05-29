import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subcontractor } from '../entities/subcontractor.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { ContractChange } from '../entities/contract-change.entity';
import { DeleteRequest } from '../entities/delete-request.entity';
import { SubcontractorsController } from './subcontractors.controller';
import { SubcontractorsService } from './subcontractors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subcontractor, Subcontract, MonthlyBilling, ContractChange, DeleteRequest])],
  controllers: [SubcontractorsController],
  providers: [SubcontractorsService],
  exports: [SubcontractorsService],
})
export class SubcontractorsModule {}
