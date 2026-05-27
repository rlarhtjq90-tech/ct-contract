import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import { MonthlySnapshot } from '../entities/monthly-snapshot.entity';
import { ProjectMetric } from '../entities/project-metric.entity';

@Injectable()
export class SnapshotsService {
  constructor(
    @InjectRepository(MonthlySnapshot) private repo: Repository<MonthlySnapshot>,
    @InjectRepository(ProjectMetric) private metricRepo: Repository<ProjectMetric>,
  ) {}

  findByMonth(month: string) {
    return this.repo.findOne({ where: { snapshotMonth: month } });
  }

  findAll() {
    return this.repo.find({ order: { snapshotMonth: 'DESC' } });
  }

  // 월말 스냅샷 생성
  async createSnapshot(month?: string) {
    const targetMonth = month || format(new Date(), 'yyyy-MM');
    const metrics = await this.metricRepo.find();

    const existing = await this.findByMonth(targetMonth);
    const snapshot = existing || this.repo.create({ snapshotMonth: targetMonth });
    snapshot.metricsJson = { metrics, createdAt: new Date().toISOString() };

    return this.repo.save(snapshot);
  }
}
