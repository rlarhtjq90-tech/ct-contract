import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ProjectBillingsService } from './project-billings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('project-billings')
@UseGuards(JwtAuthGuard)
export class ProjectBillingsController {
  constructor(private readonly service: ProjectBillingsService) {}

  @Get()
  findByMonth(@Query('month') month: string) {
    const m = month || new Date().toISOString().slice(0, 7);
    return this.service.findByMonth(m);
  }

  @Post('bulk')
  bulkUpdate(@Body() body: { updates: any[] }) {
    return this.service.bulkUpdate(body.updates || []);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.service.approve(Number(id), req.user?.name || 'admin');
  }

  @Delete('orphans')
  deleteOrphans() {
    return this.service.deleteOrphans();
  }
}
