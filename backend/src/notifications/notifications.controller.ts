import { Controller, Get, Put, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get('unread-count') getUnreadCount() { return this.service.getUnreadCount(); }
  @Put(':id/read') markRead(@Param('id', ParseIntPipe) id: number) { return this.service.markRead(id); }
}
