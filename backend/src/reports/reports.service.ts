import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { ProjectBilling } from '../entities/project-billing.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
    @InjectRepository(ProjectBilling) private projectBillingRepo: Repository<ProjectBilling>,
    @InjectRepository(MonthlyBilling) private monthlyBillingRepo: Repository<MonthlyBilling>,
    @InjectRepository(ContractChange) private changeRepo: Repository<ContractChange>,
  ) {}

  async getOverview() {
    const [projects, projectBillings, monthlyBillings, allChanges] = await Promise.all([
      this.projectRepo.find({
        relations: { client: true, subcontracts: { subcontractor: true } },
        order: { clientId: 'ASC', createdAt: 'ASC' },
      }),
      this.projectBillingRepo.find(),
      this.monthlyBillingRepo.find(),
      this.changeRepo.find(),
    ]);

    // Group by client
    const clientMap = new Map<number, { client: any; projects: any[] }>();

    for (const project of projects) {
      const clientId = project.clientId;
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: { id: project.client?.id, name: project.client?.name ?? '-' },
          projects: [],
        });
      }

      // 도급 기성 누계 (최신 cumulativeAmount)
      const pb = projectBillings.filter((b) => b.projectId === project.id);
      const projCumulative =
        pb.length > 0 ? Math.max(...pb.map((b) => Number(b.cumulativeAmount))) : 0;
      const projCurrent = Number(project.currentAmount);
      const projProgress = projCurrent > 0 ? (projCumulative / projCurrent) * 100 : 0;

      const projChangeCount = allChanges.filter(
        (c) => c.targetType === ChangeTargetType.PROJECT && c.targetId === project.id,
      ).length;

      // 하도급계약 목록
      const subData = (project.subcontracts ?? []).map((sub) => {
        const mb = monthlyBillings.filter((b) => b.subcontractId === sub.id);
        const subCumulative =
          mb.length > 0 ? Math.max(...mb.map((b) => Number(b.cumulativeAmount))) : 0;
        const subCurrent = Number(sub.currentAmount);
        const subProgress = subCurrent > 0 ? (subCumulative / subCurrent) * 100 : 0;

        const subChangeCount = allChanges.filter(
          (c) => c.targetType === ChangeTargetType.SUBCONTRACT && c.targetId === sub.id,
        ).length;

        return {
          id: sub.id,
          subcontractorName: sub.subcontractor?.name ?? '-',
          contractNo: sub.contractNo ?? '-',
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          originalAmount: Number(sub.contractAmount),
          currentAmount: subCurrent,
          billingCumulative: subCumulative,
          billingProgress: Math.round(subProgress * 10) / 10,
          changeCount: subChangeCount,
        };
      });

      const subTotal = subData.reduce((s, d) => s + d.currentAmount, 0);
      const subRatio = projCurrent > 0 ? (subTotal / projCurrent) * 100 : 0;

      clientMap.get(clientId)!.projects.push({
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        originalAmount: Number(project.contractAmount),
        currentAmount: projCurrent,
        billingCumulative: projCumulative,
        billingProgress: Math.round(projProgress * 10) / 10,
        changeCount: projChangeCount,
        subcontracts: subData,
        subTotal,
        subRatio: Math.round(subRatio * 10) / 10,
      });
    }

    return Array.from(clientMap.values());
  }
}
