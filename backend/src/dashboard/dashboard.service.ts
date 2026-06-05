import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format, subMonths, addDays } from 'date-fns';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Subcontract, SubcontractStatus } from '../entities/subcontract.entity';
import { MonthlyBilling, BillingStatus } from '../entities/monthly-billing.entity';
import { ProjectMetric } from '../entities/project-metric.entity';
import { ProjectBilling } from '../entities/project-billing.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subRepo: Repository<Subcontract>,
    @InjectRepository(MonthlyBilling) private billingRepo: Repository<MonthlyBilling>,
    @InjectRepository(ProjectMetric) private metricRepo: Repository<ProjectMetric>,
    @InjectRepository(ProjectBilling) private projectBillingRepo: Repository<ProjectBilling>,
  ) {}

  async getSummary() {
    const currentMonth = format(new Date(), 'yyyy-MM');

    const [totalProjects, totalSubcontracts, metrics] = await Promise.all([
      this.projectRepo.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.subRepo.count({ where: { status: SubcontractStatus.ACTIVE } }),
      this.metricRepo.find(),
    ]);

    let totalSubMetricAmount = 0;
    let weightedSum = 0;
    let delayedCount = 0;
    for (const m of metrics) {
      const amt = Number(m.totalSubcontractAmount);
      totalSubMetricAmount += amt;
      weightedSum += amt * Number(m.weightedProgress);
      delayedCount += m.delayedCount;
    }
    const companyProgress = totalSubMetricAmount > 0 ? weightedSum / totalSubMetricAmount : 0;

    const newSubs = await this.subRepo
      .createQueryBuilder('s')
      .where(`substr(s.created_at, 1, 7) = :month`, { month: currentMonth })
      .getCount().catch(() => 0);

    // 도급 현재금액 합계
    const projectAmountResult = await this.projectRepo
      .createQueryBuilder('p')
      .select('SUM(p.current_amount)', 'total')
      .where('p.status = :status', { status: ProjectStatus.ACTIVE })
      .getRawOne();

    // 하도급 현재금액 합계
    const subAmountResult = await this.subRepo
      .createQueryBuilder('s')
      .select('SUM(s.current_amount)', 'total')
      .where('s.status = :status', { status: SubcontractStatus.ACTIVE })
      .getRawOne();

    // 도급 기성 누계 (모든 월 중 최대 cumulativeAmount 합산)
    const projBillingCumResult = await this.projectBillingRepo
      .createQueryBuilder('pb')
      .select('pb.project_id', 'pid')
      .addSelect('MAX(pb.cumulative_amount)', 'maxCum')
      .groupBy('pb.project_id')
      .getRawMany();
    const totalProjectBillingCumulative = projBillingCumResult.reduce(
      (s, r) => s + Number(r.maxCum || 0), 0,
    );

    const totalProjectAmount  = Number(projectAmountResult?.total || 0);
    const totalSubcontractAmount = Number(subAmountResult?.total || 0);
    const subRatio = totalProjectAmount > 0
      ? Math.round((totalSubcontractAmount / totalProjectAmount) * 1000) / 10
      : 0;

    return {
      asOf: new Date().toISOString(),
      kpi: {
        totalProjects,
        totalSubcontracts,
        newSubcontractsThisMonth: newSubs,
        totalContractAmount: totalProjectAmount,
        totalSubcontractAmount,
        totalProjectBillingCumulative,
        subRatio,
        weightedAvgProgress: Math.round(companyProgress * 10) / 10,
        delayedCount,
      },
    };
  }

  async getProgressTrend(months = 12) {
    const result: Array<{ month: string; progress: number; billing: number }> = [];

    const allSubs = await this.subRepo.find({ select: { id: true, contractAmount: true } });
    const totalContractAmount = allSubs.reduce((s, c) => s + Number(c.contractAmount), 0);

    for (let i = months - 1; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), 'yyyy-MM');

      const billingData = await this.billingRepo
        .createQueryBuilder('b')
        .select('SUM(b.actual_amount)', 'totalBilling')
        .where('b.billing_month = :month', { month })
        .getRawOne();

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

    // 하도급 기성
    const subBillings = await this.billingRepo.find({ where: { billingMonth: currentMonth } });
    const subTotal     = subBillings.length;
    const subSubmitted = subBillings.filter((b) => b.status !== BillingStatus.PENDING).length;
    const subApproved  = subBillings.filter((b) => b.status === BillingStatus.APPROVED).length;
    const subAnomalies = subBillings.filter((b) => b.isAnomaly).length;

    // 도급 기성
    const projBillings = await this.projectBillingRepo.find({ where: { billingMonth: currentMonth } });
    const projTotal     = projBillings.length;
    const projSubmitted = projBillings.filter((b) => b.status !== BillingStatus.PENDING).length;
    const projApproved  = projBillings.filter((b) => b.status === BillingStatus.APPROVED).length;
    const projAnomalies = projBillings.filter((b) => b.isAnomaly).length;

    return {
      month: currentMonth,
      // 기존 호환 (하도급 기성)
      total: subTotal,
      submitted: subSubmitted,
      approved: subApproved,
      anomalies: subAnomalies,
      // 도급·하도급 분리
      sub: { total: subTotal, submitted: subSubmitted, approved: subApproved, anomalies: subAnomalies },
      proj: { total: projTotal, submitted: projSubmitted, approved: projApproved, anomalies: projAnomalies },
    };
  }

  // 도급계약별 기성 비교 (도급기성 누계 vs 하도급기성 합계 누계)
  async getBillingComparison() {
    // 활성 도급계약 + 소속 하도급계약 목록
    const projects = await this.projectRepo.find({
      where: { status: ProjectStatus.ACTIVE },
      relations: { subcontracts: true },
    });

    // 프로젝트별 도급기성 누계 (approved, MAX cumulative)
    const projBillingData = await this.projectBillingRepo
      .createQueryBuilder('pb')
      .select('pb.project_id', 'projectId')
      .addSelect('MAX(pb.cumulative_amount)', 'cumul')
      .where('pb.status = :status', { status: BillingStatus.APPROVED })
      .groupBy('pb.project_id')
      .getRawMany();

    // 하도급계약별 기성 누계 (approved, MAX cumulative per subcontract)
    const subBillingData = await this.billingRepo
      .createQueryBuilder('b')
      .select('b.subcontract_id', 'subcontractId')
      .addSelect('MAX(b.cumulative_amount)', 'cumul')
      .where('b.status = :status', { status: BillingStatus.APPROVED })
      .groupBy('b.subcontract_id')
      .getRawMany();

    const projBillingMap = new Map(
      projBillingData.map((r) => [Number(r.projectId), Number(r.cumul || 0)]),
    );
    const subBillingMap = new Map(
      subBillingData.map((r) => [Number(r.subcontractId), Number(r.cumul || 0)]),
    );

    return projects.map((p) => {
      const contractAmount = Number(p.currentAmount);
      const subcontractTotal =
        p.subcontracts?.reduce((s, c) => s + Number(c.currentAmount), 0) || 0;
      const projBillingCumul = projBillingMap.get(p.id) || 0;
      const subBillingCumul =
        p.subcontracts?.reduce((s, c) => s + (subBillingMap.get(c.id) || 0), 0) || 0;
      const projProgressRate =
        contractAmount > 0
          ? Math.round((projBillingCumul / contractAmount) * 1000) / 10
          : 0;
      const subProgressRate =
        subcontractTotal > 0
          ? Math.round((subBillingCumul / subcontractTotal) * 1000) / 10
          : 0;

      return {
        projectId: p.id,
        projectName: p.name,
        projectCode: p.projectCode,
        contractAmount,
        subcontractTotal,
        projBillingCumul,
        projProgressRate,
        subBillingCumul,
        subProgressRate,
        gap: projBillingCumul - subBillingCumul,
      };
    });
  }

  // 만료 예정 (30일 이내)
  async getUpcomingExpiry(days = 30) {
    const today = new Date();
    const limit = addDays(today, days);
    const todayStr = format(today, 'yyyy-MM-dd');
    const limitStr = format(limit, 'yyyy-MM-dd');

    const projects = await this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'c')
      .where('p.status = :status', { status: ProjectStatus.ACTIVE })
      .andWhere('p.end_date IS NOT NULL')
      .andWhere('p.end_date >= :today', { today: todayStr })
      .andWhere('p.end_date <= :limit', { limit: limitStr })
      .orderBy('p.end_date', 'ASC')
      .getMany();

    const subcontracts = await this.subRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.subcontractor', 'sr')
      .leftJoinAndSelect('s.project', 'p')
      .where('s.status = :status', { status: SubcontractStatus.ACTIVE })
      .andWhere('s.end_date IS NOT NULL')
      .andWhere('s.end_date >= :today', { today: todayStr })
      .andWhere('s.end_date <= :limit', { limit: limitStr })
      .orderBy('s.end_date', 'ASC')
      .getMany();

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        clientName: p.client?.name ?? '',
        endDate: p.endDate,
        daysLeft: Math.ceil((new Date(p.endDate).getTime() - today.getTime()) / 86400000),
        type: 'project' as const,
      })),
      subcontracts: subcontracts.map((s) => ({
        id: s.id,
        subcontractorName: s.subcontractor?.name ?? '',
        projectName: s.project?.name ?? '',
        endDate: s.endDate,
        daysLeft: Math.ceil((new Date(s.endDate).getTime() - today.getTime()) / 86400000),
        type: 'subcontract' as const,
      })),
    };
  }
}
