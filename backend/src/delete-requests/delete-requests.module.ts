import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeleteRequest } from '../entities/delete-request.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { DeleteRequestsService } from './delete-requests.service';
import { DeleteRequestsController } from './delete-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeleteRequest, Project, Subcontract])],
  providers: [DeleteRequestsService],
  controllers: [DeleteRequestsController],
  exports: [DeleteRequestsService],
})
export class DeleteRequestsModule {}
