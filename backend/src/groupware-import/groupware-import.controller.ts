import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { GroupwareImportService, ImportPayloadDto } from './groupware-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('groupware-import')
export class GroupwareImportController {
  constructor(private service: GroupwareImportService) {}

  /** 그룹웨어 동기화 봇이 호출 (서버간, API 키 인증) */
  @Post('documents')
  @UseGuards(ApiKeyGuard)
  importDocuments(@Body() payload: ImportPayloadDto) {
    return this.service.importDocuments(payload);
  }

  /** 아래부터는 사람이 쓰는 검토 화면 (admin/pm만) */
  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  getSummary() {
    return this.service.getSummary();
  }

  @Get('review-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  getReviewQueue() {
    return this.service.getReviewQueue();
  }

  @Post('review-queue/:id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  applyLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { subcontractId: number; billingMonth: string },
  ) {
    return this.service.applyLine(id, body.subcontractId, body.billingMonth);
  }

  @Post('review-queue/:id/ignore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  ignoreLine(@Param('id', ParseIntPipe) id: number, @Body() body: { note?: string }) {
    return this.service.ignoreLine(id, body.note);
  }
}
