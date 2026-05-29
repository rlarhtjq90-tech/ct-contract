import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SubcontractorsService, CreateSubcontractorDto } from './subcontractors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subcontractors')
@UseGuards(JwtAuthGuard)
export class SubcontractorsController {
  constructor(private service: SubcontractorsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateSubcontractorDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateSubcontractorDto>) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
