import { Controller, Get, Post, Delete, Param, Body, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { SubcontractsService, CreateSubcontractDto } from './subcontracts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subcontracts')
@UseGuards(JwtAuthGuard)
export class SubcontractsController {
  constructor(private service: SubcontractsService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId ? parseInt(projectId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateSubcontractDto) { return this.service.create(dto); }

  @Post(':id/changes')
  addChange(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { deltaAmount: number; reason: string; effectiveDate?: string },
    @Request() req: any,
  ) {
    return this.service.addChange(id, body.deltaAmount, body.reason, req.user?.name || 'system', body.effectiveDate);
  }

  @Get(':id/changes')
  getChanges(@Param('id', ParseIntPipe) id: number) { return this.service.getChanges(id); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
