import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from '../entities/project.entity';
import { ProjectMetric } from '../entities/project-metric.entity';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';
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
}
