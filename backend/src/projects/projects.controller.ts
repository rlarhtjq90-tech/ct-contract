import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ProjectsService, CreateProjectDto, AddChangeDto } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateProjectDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateProjectDto>) {
    return this.service.update(id, dto);
  }

  @Post(':id/changes')
  addChange(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddChangeDto,
    @Request() req: any,
  ) {
    return this.service.addChange(id, dto, req.user?.name || 'system');
  }

  @Get(':id/changes')
  getChanges(@Param('id', ParseIntPipe) id: number) {
    return this.service.getChanges(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
