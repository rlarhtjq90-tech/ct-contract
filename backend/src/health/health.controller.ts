import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async check() {
    // DB 연결도 함께 warm-up
    await this.dataSource.query('SELECT 1');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
