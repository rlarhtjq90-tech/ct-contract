import { Controller, Get, Post, Delete, Query, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('snapshots')
@UseGuards(JwtAuthGuard)
export class SnapshotsController {
  constructor(private service: SnapshotsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('by-month')
  findByMonth(@Query('month') month: string) { return this.service.findByMonth(month); }

  @Post('create')
  createSnapshot(@Query('month') month?: string, @Request() req?: any) {
    if (req?.user?.role !== 'admin') throw new ForbiddenException('admin만 스냅샷을 생성할 수 있습니다.');
    return this.service.createSnapshot(month);
  }

  @Delete(':month')
  deleteSnapshot(@Param('month') month: string, @Request() req: any) {
    if (req?.user?.role !== 'admin') throw new ForbiddenException('admin만 스냅샷을 삭제할 수 있습니다.');
    return this.service.deleteSnapshot(month);
  }
}
