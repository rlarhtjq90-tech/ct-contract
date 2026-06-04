import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractChange } from '../entities/contract-change.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { ContractChangesController } from './contract-changes.controller';
import { ContractChangesService } from './contract-changes.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContractChange, Project, Subcontract])],
  controllers: [ContractChangesController],
  providers: [ContractChangesService],
})
export class ContractChangesModule {}
