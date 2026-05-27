import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import { ProjectMetric } from '../entities/project-metric.entity';
import { Subcontract, SubcontractStatus } from '../entities/subcontract.entity';
import { MonthlyBilling, BillingStatus } from '../entities/monthly-billing.entity';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(ProjectMetric) private metricRepo: Repository<ProjectMetric>,
    @InjectRepository(Subcontract) private subRepo: Repository<Subcontract>,
    @InjectRepository(MonthlyBilling) private billingRepo: Repository<MonthlyBilling>,
  ) {}

  async recalculate(projectId: number) {
    const currentMonth = format(new Date(), 'yyyy-MM');

    const subs = await this.subRepo.find({
      where: { projectId },
      relations: { billings: true },
    });

    const activeSubs = subs.filter((s) => s.status === SubcontractStatus.ACTIVE);
    const totalAmount = activeSubs.reduce((sum, s) => sum + Number(s.currentAmount), 0);

    let weightedSum = 0;
    let currentMonthBilling = 0;
    let totalApproved = 0;

    for (const sub of activeSubs) {
      const approvedBillings = sub.billings?.filter((b) => b.status === BillingStatus.APPROVED) || [];
      const cumulative = approvedBillings.reduce((s, b) => s + Number(b.actualAmount), 0);
      const progress = Number(sub.currentAmount) > 0 ? (cumulative / Number(sub.currentAmount)) * 100 : 0;
      weightedSum += progress * Number(sub.currentAmount);

      const currentBilling = sub.billings?.find((b) => b.billingMonth === currentMonth);
      if (currentBilling) currentMonthBilling += Number(currentBilling.actualAmount);
      totalApproved += cumulative;
    }

    const weightedProgress = totalAmount > 0 ? weightedSum / totalAmount : 0;

    await this.metricRepo.upsert(
      {
        projectId,
        totalSubcontracts: subs.length,
        activeSubcontracts: activeSubs.length,
        totalSubcontractAmount: totalAmount,
        weightedProgress: Math.min(weightedProgress, 999.99),
        delayedCount: 0,
        currentMonthBilling,
        totalApprovedBilling: totalApproved,
      },
      ['projectId'],
    );
  }
}
