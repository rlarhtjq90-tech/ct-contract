import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format, subMonths } from 'date-fns';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Subcontract, SubcontractStatus } from '../entities/subcontract.entity';
import { MonthlyBilling, BillingStatus } from '../entities/monthly-billing.entity';
import { ProjectMetric } from '../entities/project-metric.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subRepo: Repository<Subcontract>,
    @InjectRepository(MonthlyBilling) private billingRepo: Repository<MonthlyBilling>,
    @InjectRepository(ProjectMetric) private metricRepo: Repository<ProjectMetric>,
  ) {}

  async getSummary() {
    const currentMonth = format(new Date(), 'yyyy-MM');

    const [totalProjects, totalSubcontracts, metrics] = await Promise.all([
      this.projectRepo.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.subRepo.count({ where: { status: SubcontractStatus.ACTIVE } }),
      this.metricRepo.find(),
    ]);

    let totalAmount = 0;
    let weightedSum = 0;
    let delayedCount = 0;
    for (const m of metrics) {
      const amt = Number(m.totalSubcontractAmount);
      totalAmount += amt;
      weightedSum += amt * Number(m.weightedProgress);
      delayedCount += m.delayedCount;
    }
    const companyProgress = totalAmount > 0 ? weightedSum / totalAmount : 0;

    // SQLite: created_at stored as ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) — use substr for month match
    const newSubs = await this.subRepo
      .createQueryBuilder('s')
      .where(`substr(s.created_at, 1, 7) = :month`, { month: currentMonth })
      .getCount().catch(() => 0);

    const amountResult = await this.projectRepo
      .createQueryBuilder('p')
      .select('SUM(p.current_amount)', 'total')
      .where('p.status = :status', { status: ProjectStatus.ACTIVE })
      .getRawOne();

    return {
      asOf: new Date().toISOString(),
      kpi: {
        totalProjects,
        totalSubcontracts,
        newSubcontractsThisMonth: newSubs,
        totalContractAmount: Number(amountResult?.total || 0),
        weightedAvgProgress: Math.round(companyProgress * 10) / 10,
        delayedCount,
      },
    };
  }

  async getProgressTrend(months = 12) {
    const result: Array<{ month: string; progress: number; billing: number }> = [];

    // Get all subcontracts with contract amounts for weighted progress calc
    const allSubs = await this.subRepo.find({ select: { id: true, contractAmount: true } });
    const totalContractAmount = allSubs.reduce((s, c) => s + Number(c.contractAmount), 0);

    for (let i = months - 1; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), 'yyyy-MM');

      // Billing for this month (actual billing)
      const billingData = await this.billingRepo
        .createQueryBuilder('b')
        .select('SUM(b.actual_amount)', 'totalBilling')
        .where('b.billing_month = :month', { month })
        .getRawOne();

      // Weighted progress: sum of cumulative amounts / total contract amounts
      // Use billings up to and including this month
      const progressData = await this.billingRepo
        .createQueryBuilder('b')
        .select('b.subcontract_id', 'subId')
        .addSelect('b.cumulative_amount', 'cumulative')
        .where('b.billing_month = :month', { month })
        .getRawMany();

      let weightedCumulative = 0;
      for (const row of progressData) {
        const sub = allSubs.find(s => s.id === Number(row.subId));
        if (sub && Number(sub.contractAmount) > 0) {
          weightedCumulative += (Number(row.cumulative) / Number(sub.contractAmount)) * 100 * Number(sub.contractAmount);
        }
      }
      const progress = totalContractAmount > 0
        ? Math.round((weightedCumulative / totalContractAmount) * 10) / 10
        : 0;

      result.push({
        month,
        progress,
        billing: Number(billingData?.totalBilling || 0),
      });
    }
    return result;
  }

  async getContractComparison() {
    const projects = await this.projectRepo.find({
      where: { status: ProjectStatus.ACTIVE },
      relations: { subcontracts: true },
    });

    return projects.map((p) => {
      const subTotal = p.subcontracts?.reduce((s, c) => s + Number(c.currentAmount), 0) || 0;
      return {
        id: p.id,
        name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
        projectCode: p.projectCode,
        contractAmount: Number(p.currentAmount),
        subcontractTotal: subTotal,
        ratio: Number(p.currentAmount) > 0 ? (subTotal / Number(p.currentAmount)) * 100 : 0,
      };
    });
  }

  async getCurrentMonthStatus() {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const billings = await this.billingRepo.find({ where: { billingMonth: currentMonth } });

    const total = billings.length;
    const submitted = billings.filter((b) => b.status !== BillingStatus.PENDING).length;
    const approved = billings.filter((b) => b.status === BillingStatus.APPROVED).length;
    const anomalies = billings.filter((b) => b.isAnomaly).length;

    return { total, submitted, approved, anomalies, month: currentMonth };
  }
}
