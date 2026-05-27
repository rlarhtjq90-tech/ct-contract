import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BillingsService } from './billings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('billings')
@UseGuards(JwtAuthGuard)
export class BillingsController {
  constructor(private service: BillingsService) {}

  @Get()
  findByMonth(@Query('month') month: string) {
    return this.service.findByMonth(month || new Date().toISOString().slice(0, 7));
  }

  @Post('bulk')
  bulkUpdate(@Body() body: { updates: Array<{ id: number; plannedAmount?: number; actualAmount?: number; memo?: string }> }) {
    return this.service.bulkUpdate(body.updates);
  }

  @Put(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.approve(id, req.user?.name || 'system');
  }

  @Get('export')
  export(@Query('month') month: string) {
    return this.service.exportData(month || new Date().toISOString().slice(0, 7));
  }
}
