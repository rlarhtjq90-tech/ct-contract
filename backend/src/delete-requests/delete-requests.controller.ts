import { Controller, Get, Post, Put, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { DeleteRequestsService, CreateDeleteRequestDto } from './delete-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('delete-requests')
@UseGuards(JwtAuthGuard)
export class DeleteRequestsController {
  constructor(private service: DeleteRequestsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('pending')
  findPending() { return this.service.findPending(); }

  @Post()
  create(@Body() body: CreateDeleteRequestDto, @Request() req: any) {
    return this.service.create(body, req.user?.name || 'pm');
  }

  @Put(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id);
  }

  @Put(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }
}
