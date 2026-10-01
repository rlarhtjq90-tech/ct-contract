import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupwareDocument, GroupwareImportLine } from '../entities/groupware-import.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { BillingsModule } from '../billings/billings.module';
import { GroupwareImportController } from './groupware-import.controller';
import { GroupwareImportService } from './groupware-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupwareDocument, GroupwareImportLine, Project, Subcontract]),
    BillingsModule,
  ],
  controllers: [GroupwareImportController],
  providers: [GroupwareImportService],
})
export class GroupwareImportModule {}
