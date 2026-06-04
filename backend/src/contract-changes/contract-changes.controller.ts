import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContractChangesService } from './contract-changes.service';

@Controller('contract-changes')
@UseGuards(JwtAuthGuard)
export class ContractChangesController {
  constructor(private service: ContractChangesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
