import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { BillingsController } from './billings.controller';
import { BillingsService } from './billings.service';

@Module({
  imports: [TypeOrmModule.forFeature([MonthlyBilling, Subcontract])],
  controllers: [BillingsController],
  providers: [BillingsService],
  exports: [BillingsService],
})
export class BillingsModule {}
