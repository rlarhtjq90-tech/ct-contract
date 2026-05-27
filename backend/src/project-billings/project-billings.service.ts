import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectBilling } from '../entities/project-billing.entity';
import { BillingStatus } from '../entities/monthly-billing.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectBillingsService {
  constructor(
    @InjectRepository(ProjectBilling) private repo: Repository<ProjectBilling>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findByMonth(month: string): Promise<ProjectBilling[]> {
    // 해당 월 데이터가 없는 프로젝트에 대해 자동 생성
    const projects = await this.projectRepo.find({
      relations: { client: true },
    });

    for (const project of projects) {
      const exists = await this.repo.findOne({
        where: { projectId: project.id, billingMonth: month },
      });
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            projectId: project.id,
            billingMonth: month,
            status: BillingStatus.PENDING,
          }),
        );
      }
    }

    return this.repo.find({
      where: { billingMonth: month },
      relations: { project: { client: true } },
      order: { projectId: 'ASC' },
    });
  }

  async bulkUpdate(
    updates: Array<{ id: number; plannedAmount?: number; actualAmount?: number; memo?: string }>,
  ): Promise<ProjectBilling[]> {
    const results: ProjectBilling[] = [];

    for (const update of updates) {
      const billing = await this.repo.findOne({
        where: { id: update.id },
        relations: { project: true },
      });
      if (!billing) continue;

      // 이전 월 승인된 기성 누적합
      const prevResult = await this.repo
        .createQueryBuilder('b')
        .where('b.project_id = :pid', { pid: billing.projectId })
        .andWhere('b.billing_month < :month', { month: billing.billingMonth })
        .andWhere('b.status = :status', { status: BillingStatus.APPROVED })
        .select('SUM(b.actual_amount)', 'total')
        .getRawOne();

      const prevTotal = Number(prevResult?.total || 0);
      const newActual = update.actualAmount ?? Number(billing.actualAmount);
      const cumulative = prevTotal + newActual;
      const contractAmount = Number(billing.project?.currentAmount || 0);
      const progressRate = contractAmount > 0 ? (cumulative / contractAmount) * 100 : 0;

      // 이상치 감지: 전월 대비 ±30%
      let isAnomaly = false;
      let anomalyReason = '';
      const prevMonthBilling = await this.getPrevMonthBilling(billing.projectId, billing.billingMonth);
      const prevActual = prevMonthBilling ? Number(prevMonthBilling.actualAmount) : 0;
      if (prevActual > 0 && newActual > 0) {
        const changeRate = Math.abs((newActual - prevActual) / prevActual);
        if (changeRate > 0.3) {
          isAnomaly = true;
          anomalyReason = `전월 대비 ${(changeRate * 100).toFixed(0)}% 변동 (전월: ${prevActual.toLocaleString()}원)`;
        }
      }

      await this.repo.update(update.id, {
        plannedAmount: update.plannedAmount ?? billing.plannedAmount,
        actualAmount: newActual,
        cumulativeAmount: cumulative,
        progressRate: Math.min(progressRate, 999.99),
        isAnomaly,
        anomalyReason,
        memo: update.memo ?? billing.memo,
        status: BillingStatus.SUBMITTED,
      });

      const updated = await this.repo.findOne({ where: { id: update.id } });
      if (updated) results.push(updated);
    }

    return results;
  }

  async approve(id: number, approvedBy: string): Promise<ProjectBilling> {
    const billing = await this.repo.findOne({ where: { id } });
    if (!billing) throw new NotFoundException('기성을 찾을 수 없습니다.');

    await this.repo.update(id, {
      status: BillingStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy,
    });

    this.eventEmitter.emit('project-billing.approved', {
      billingId: id,
      projectId: billing.projectId,
      month: billing.billingMonth,
    });

    return this.repo.findOne({ where: { id } });
  }

  private async getPrevMonthBilling(projectId: number, currentMonth: string) {
    const [year, mon] = currentMonth.split('-').map(Number);
    const prev = mon === 1
      ? `${year - 1}-12`
      : `${year}-${String(mon - 1).padStart(2, '0')}`;
    return this.repo.findOne({ where: { projectId, billingMonth: prev } });
  }
}
