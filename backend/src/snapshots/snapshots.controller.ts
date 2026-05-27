import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('snapshots')
@UseGuards(JwtAuthGuard)
export class SnapshotsController {
  constructor(private service: SnapshotsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get('by-month') findByMonth(@Query('month') month: string) { return this.service.findByMonth(month); }
  @Post('create') createSnapshot(@Query('month') month?: string) { return this.service.createSnapshot(month); }
}
