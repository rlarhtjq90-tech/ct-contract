import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { ContractChange } from '../entities/contract-change.entity';
import { DeleteRequest } from '../entities/delete-request.entity';
import { SubcontractsController } from './subcontracts.controller';
import { SubcontractsService } from './subcontracts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subcontract, MonthlyBilling, ContractChange, DeleteRequest])],
  controllers: [SubcontractsController],
  providers: [SubcontractsService],
  exports: [SubcontractsService],
})
export class SubcontractsModule {}
