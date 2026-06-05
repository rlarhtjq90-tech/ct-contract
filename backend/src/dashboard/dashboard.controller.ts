import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  getSummary() { return this.service.getSummary(); }

  @Get('progress-trend')
  getProgressTrend(@Query('months') months?: string) {
    return this.service.getProgressTrend(months ? parseInt(months) : 12);
  }

  @Get('contract-comparison')
  getContractComparison() { return this.service.getContractComparison(); }

  @Get('current-month')
  getCurrentMonth() { return this.service.getCurrentMonthStatus(); }

  @Get('upcoming-expiry')
  getUpcomingExpiry(@Query('days') days?: string) {
    return this.service.getUpcomingExpiry(days ? parseInt(days) : 30);
  }

  @Get('billing-comparison')
  getBillingComparison() { return this.service.getBillingComparison(); }
}
