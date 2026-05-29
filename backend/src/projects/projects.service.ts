import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from '../entities/project.entity';
import { ProjectMetric } from '../entities/project-metric.entity';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';
import { ProjectBilling } from '../entities/project-billing.entity';
import { DeleteRequest } from '../entities/delete-request.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateProjectDto {
  @IsNumber() clientId: number;
  @IsString() projectCode: string;
  @IsString() name: string;
  @IsNumber() contractAmount: number;
  @IsOptional() @IsDateString() contractDate?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() description?: string;
}

export class AddChangeDto {
  @IsNumber() deltaAmount: number;
  @IsString() reason: string;
  @IsOptional() @IsDateString() effectiveDate?: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private repo: Repository<Project>,
    @InjectRepository(ProjectMetric) private metricRepo: Repository<ProjectMetric>,
    @InjectRepository(ContractChange) private changeRepo: Repository<ContractChange>,
    @InjectRepository(ProjectBilling) private billingRepo: Repository<ProjectBilling>,
    @InjectRepository(DeleteRequest) private deleteRequestRepo: Repository<DeleteRequest>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
    @InjectRepository(MonthlyBilling) private monthlyBillingRepo: Repository<MonthlyBilling>,
    private eventEmitter: EventEmitter2,
  ) {}

  findAll() {
    return this.repo.find({
      relations: { client: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({
      where: { id },
      relations: { client: true, subcontracts: { subcontractor: true } },
    });
    if (!p) throw new NotFoundException('도급계약을 찾을 수 없습니다.');
    return p;
  }

  async create(dto: CreateProjectDto) {
    const project = this.repo.create({
      ...dto,
      currentAmount: dto.contractAmount,
    });
    const saved = await this.repo.save(project);
    await this.metricRepo.save({ projectId: saved.id });
    this.eventEmitter.emit('project.created', { projectId: saved.id });
    return saved;
  }

  async update(id: number, dto: Partial<CreateProjectDto>) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async addChange(id: number, dto: AddChangeDto, createdBy: string) {
    const project = await this.findOne(id);
    const lastChange = await this.changeRepo.count({
      where: { targetType: ChangeTargetType.PROJECT, targetId: id },
    });
    const change = this.changeRepo.create({
      targetType: ChangeTargetType.PROJECT,
      targetId: id,
      changeNo: lastChange + 1,
      beforeAmount: Number(project.currentAmount),
      deltaAmount: dto.deltaAmount,
      afterAmount: Number(project.currentAmount) + dto.deltaAmount,
      reason: dto.reason,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      createdBy,
    });
    await this.changeRepo.save(change);
    await this.repo.update(id, { currentAmount: Number(project.currentAmount) + dto.deltaAmount });
    this.eventEmitter.emit('project.changed', { projectId: id });
    return this.findOne(id);
  }

  getChanges(id: number) {
    return this.changeRepo.find({
      where: { targetType: ChangeTargetType.PROJECT, targetId: id },
      order: { changeNo: 'ASC' },
    });
  }

  async remove(id: number) {
    // 1. 하도급계약과 그 연관 데이터 cascade 삭제
    const subcontracts = await this.subcontractRepo.find({
      where: { projectId: id },
      select: { id: true },
    });
    if (subcontracts.length > 0) {
      const subIds = subcontracts.map((s) => s.id);
      await this.monthlyBillingRepo                            // 하도급 기성현황
        .createQueryBuilder().delete()
        .where('subcontract_id IN (:...ids)', { ids: subIds })
        .execute();
      await this.changeRepo                                    // 하도급 계약변경 이력
        .createQueryBuilder().delete()
        .where('target_type = :type AND target_id IN (:...ids)', { type: ChangeTargetType.SUBCONTRACT, ids: subIds })
        .execute();
      await this.deleteRequestRepo                             // 하도급 삭제요청 이력
        .createQueryBuilder().delete()
        .where('target_type = :type AND target_id IN (:...ids)', { type: 'subcontract', ids: subIds })
        .execute();
      await this.subcontractRepo.delete(subIds);               // 하도급계약
    }

    // 2. 도급계약 연관 데이터 삭제
    await this.billingRepo.delete({ projectId: id });           // 도급 기성현황
    await this.metricRepo.delete({ projectId: id });            // 집계 메트릭
    await this.changeRepo.delete({ targetType: ChangeTargetType.PROJECT, targetId: id }); // 계약변경 이력
    await this.deleteRequestRepo.delete({ targetType: 'project', targetId: id });         // 삭제요청 이력
    await this.repo.delete(id);
    return { success: true };
  }
}
