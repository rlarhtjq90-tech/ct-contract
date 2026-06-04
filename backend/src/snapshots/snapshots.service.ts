import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import { MonthlySnapshot } from '../entities/monthly-snapshot.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { ProjectBilling } from '../entities/project-billing.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';

@Injectable()
export class SnapshotsService {
  constructor(
    @InjectRepository(MonthlySnapshot) private repo: Repository<MonthlySnapshot>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
    @InjectRepository(ProjectBilling) private projectBillingRepo: Repository<ProjectBilling>,
    @InjectRepository(MonthlyBilling) private billingRepo: Repository<MonthlyBilling>,
  ) {}

  findByMonth(month: string) {
    return this.repo.findOne({ where: { snapshotMonth: month } });
  }

  findAll() {
    return this.repo.find({ order: { snapshotMonth: 'DESC' } });
  }

  // 월말 스냅샷 생성 — 현재 계약·기성 데이터를 JSON으로 동결
  async createSnapshot(month?: string) {
    const targetMonth = month || format(new Date(), 'yyyy-MM');

    // 모든 도급계약 (발주처 포함)
    const projects = await this.projectRepo.find({
      relations: { client: true, subcontracts: { subcontractor: true } },
      order: { id: 'ASC' },
    });

    // 해당 월 도급 기성
    const projBillings = await this.projectBillingRepo.find({
      where: { billingMonth: targetMonth },
    });
    const projBillingMap = new Map(projBillings.map((b) => [b.projectId, b]));

    // 해당 월 하도급 기성 (전체)
    const subBillings = await this.billingRepo.find({
      where: { billingMonth: targetMonth },
    });
    const subBillingMap = new Map(subBillings.map((b) => [b.subcontractId, b]));

    // 누계 기성 (전 월까지의 최대 cumulativeAmount)
    const allProjBillings = await this.projectBillingRepo.find();
    const projCumMap = new Map<number, number>();
    for (const b of allProjBillings) {
      const prev = projCumMap.get(b.projectId) ?? 0;
      if (Number(b.cumulativeAmount) > prev) projCumMap.set(b.projectId, Number(b.cumulativeAmount));
    }

    const allSubBillings = await this.billingRepo.find();
    const subCumMap = new Map<number, number>();
    for (const b of allSubBillings) {
      const prev = subCumMap.get(b.subcontractId) ?? 0;
      if (Number(b.cumulativeAmount) > prev) subCumMap.set(b.subcontractId, Number(b.cumulativeAmount));
    }

    // 스냅샷 데이터 구성
    let totalProjectAmount = 0;
    let totalSubcontractAmount = 0;
    let totalProjectBilling = 0;
    let totalSubcontractBilling = 0;
    let totalSubcontractCount = 0;

    const projectSnapshots = projects.map((p) => {
      const pb = projBillingMap.get(p.id);
      const currentAmt = Number(p.currentAmount);
      const billingAmt = pb ? Number(pb.actualAmount) : 0;
      const cumulativeAmt = projCumMap.get(p.id) ?? 0;

      totalProjectAmount += currentAmt;
      totalProjectBilling += billingAmt;

      const subSnaps = (p.subcontracts || []).map((s) => {
        const sb = subBillingMap.get(s.id);
        const subCurrAmt = Number(s.currentAmount);
        const subBillingAmt = sb ? Number(sb.actualAmount) : 0;
        const subCumAmt = subCumMap.get(s.id) ?? 0;

        totalSubcontractAmount += subCurrAmt;
        totalSubcontractBilling += subBillingAmt;
        totalSubcontractCount += 1;

        return {
          id: s.id,
          subcontractorName: s.subcontractor?.name ?? '',
          contractNo: s.contractNo ?? '',
          workScope: s.workScope ?? '',
          contractAmount: Number(s.contractAmount),
          currentAmount: subCurrAmt,
          billingAmount: subBillingAmt,
          billingCumulative: subCumAmt,
          billingProgress: subCurrAmt > 0 ? Math.round((subCumAmt / subCurrAmt) * 10000) / 100 : 0,
          status: s.status,
        };
      });

      return {
        id: p.id,
        name: p.name,
        projectCode: p.projectCode,
        clientName: p.client?.name ?? '',
        status: p.status,
        contractAmount: Number(p.contractAmount),
        currentAmount: currentAmt,
        billingAmount: billingAmt,
        billingCumulative: cumulativeAmt,
        billingProgress: currentAmt > 0 ? Math.round((cumulativeAmt / currentAmt) * 10000) / 100 : 0,
        subcontracts: subSnaps,
      };
    });

    const metricsJson = {
      month: targetMonth,
      createdAt: new Date().toISOString(),
      summary: {
        projectCount: projects.length,
        subcontractCount: totalSubcontractCount,
        totalProjectAmount,
        totalSubcontractAmount,
        totalProjectBilling,
        totalSubcontractBilling,
      },
      projects: projectSnapshots,
    };

    const existing = await this.findByMonth(targetMonth);
    const snapshot = existing || this.repo.create({ snapshotMonth: targetMonth });
    snapshot.metricsJson = metricsJson;

    return this.repo.save(snapshot);
  }

  async deleteSnapshot(month: string) {
    const snap = await this.repo.findOne({ where: { snapshotMonth: month } });
    if (!snap) throw new NotFoundException(`${month} 스냅샷을 찾을 수 없습니다.`);
    await this.repo.remove(snap);
    return { success: true };
  }
}
