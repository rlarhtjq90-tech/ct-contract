import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';

@Injectable()
export class ContractChangesService {
  constructor(
    @InjectRepository(ContractChange) private changeRepo: Repository<ContractChange>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
  ) {}

  async findAll() {
    const allChanges = await this.changeRepo.find({
      order: { targetId: 'ASC', changeNo: 'ASC' },
    });

    const projectChanges = allChanges.filter(
      (c) => c.targetType === ChangeTargetType.PROJECT,
    );
    const subcontractChanges = allChanges.filter(
      (c) => c.targetType === ChangeTargetType.SUBCONTRACT,
    );

    const projectIds = [...new Set(projectChanges.map((c) => c.targetId))];
    const subcontractIds = [...new Set(subcontractChanges.map((c) => c.targetId))];

    const projectsData =
      projectIds.length > 0
        ? await this.projectRepo.find({
            where: { id: In(projectIds) },
            relations: { client: true },
          })
        : [];

    const subcontractsData =
      subcontractIds.length > 0
        ? await this.subcontractRepo.find({
            where: { id: In(subcontractIds) },
            relations: { subcontractor: true, project: { client: true } },
          })
        : [];

    const mapChange = (c: ContractChange) => ({
      id: c.id,
      changeNo: c.changeNo,
      beforeAmount: Number(c.beforeAmount),
      deltaAmount: Number(c.deltaAmount),
      afterAmount: Number(c.afterAmount),
      reason: c.reason,
      effectiveDate: c.effectiveDate,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
    });

    const projectGroups = projectIds.map((id) => {
      const project = projectsData.find((p) => p.id === id);
      const changes = projectChanges.filter((c) => c.targetId === id);
      const last = changes[changes.length - 1];
      return {
        targetType: 'project' as const,
        targetId: id,
        targetName: project?.name ?? '(삭제된 계약)',
        targetCode: '-',
        relatedName: project?.client?.name ?? '-',
        originalAmount: Number(changes[0]?.beforeAmount ?? 0),
        currentAmount: Number(project?.currentAmount ?? last?.afterAmount ?? 0),
        changeCount: changes.length,
        latestDate: last?.effectiveDate ?? last?.createdAt ?? null,
        changes: changes.map(mapChange),
      };
    });

    const subcontractGroups = subcontractIds.map((id) => {
      const sub = subcontractsData.find((s) => s.id === id);
      const changes = subcontractChanges.filter((c) => c.targetId === id);
      const last = changes[changes.length - 1];
      return {
        targetType: 'subcontract' as const,
        targetId: id,
        targetName: sub?.subcontractor?.name ?? '(삭제된 계약)',
        targetCode: sub?.contractNo ?? '-',
        relatedName: sub?.project?.name ?? '-',
        originalAmount: Number(changes[0]?.beforeAmount ?? 0),
        currentAmount: Number(sub?.currentAmount ?? last?.afterAmount ?? 0),
        changeCount: changes.length,
        latestDate: last?.effectiveDate ?? last?.createdAt ?? null,
        changes: changes.map(mapChange),
      };
    });

    return [...projectGroups, ...subcontractGroups].sort((a, b) => {
      const aT = a.latestDate ? new Date(a.latestDate).getTime() : 0;
      const bT = b.latestDate ? new Date(b.latestDate).getTime() : 0;
      return bT - aT;
    });
  }
}
