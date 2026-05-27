import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { format } from 'date-fns';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling, BillingStatus } from '../entities/monthly-billing.entity';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';
import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateSubcontractDto {
  @IsNumber() projectId: number;
  @IsNumber() subcontractorId: number;
  @IsOptional() @IsString() contractNo?: string;
  @IsOptional() @IsString() workScope?: string;
  @IsNumber() contractAmount: number;
  @IsOptional() @IsDateString() contractDate?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

@Injectable()
export class SubcontractsService {
  constructor(
    @InjectRepository(Subcontract) private repo: Repository<Subcontract>,
    @InjectRepository(MonthlyBilling) private billingRepo: Repository<MonthlyBilling>,
    @InjectRepository(ContractChange) private changeRepo: Repository<ContractChange>,
    private eventEmitter: EventEmitter2,
  ) {}

  findAll(projectId?: number) {
    const where = projectId ? { projectId } : {};
    return this.repo.find({
      where,
      relations: { subcontractor: true, project: { client: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({
      where: { id },
      relations: { subcontractor: true, project: { client: true }, billings: true },
    });
    if (!s) throw new NotFoundException('하도급계약을 찾을 수 없습니다.');
    return s;
  }

  async create(dto: CreateSubcontractDto) {
    const sub = this.repo.create({
      ...dto,
      currentAmount: dto.contractAmount,
      contractDate: dto.contractDate ? new Date(dto.contractDate) : new Date(),
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
    const saved = await this.repo.save(sub);

    const currentMonth = format(new Date(), 'yyyy-MM');
    await this.billingRepo.save(
      this.billingRepo.create({
        subcontractId: saved.id,
        billingMonth: currentMonth,
        status: BillingStatus.PENDING,
      }),
    );

    this.eventEmitter.emit('subcontract.created', {
      subcontractId: saved.id,
      projectId: saved.projectId,
      amount: saved.contractAmount,
    });

    return saved;
  }

  async addChange(id: number, deltaAmount: number, reason: string, createdBy: string, effectiveDate?: string) {
    const sub = await this.findOne(id);
    const lastChange = await this.changeRepo.count({
      where: { targetType: ChangeTargetType.SUBCONTRACT, targetId: id },
    });
    await this.changeRepo.save(
      this.changeRepo.create({
        targetType: ChangeTargetType.SUBCONTRACT,
        targetId: id,
        changeNo: lastChange + 1,
        beforeAmount: Number(sub.currentAmount),
        deltaAmount,
        afterAmount: Number(sub.currentAmount) + deltaAmount,
        reason,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        createdBy,
      }),
    );
    await this.repo.update(id, { currentAmount: Number(sub.currentAmount) + deltaAmount });
    this.eventEmitter.emit('subcontract.changed', { subcontractId: id, projectId: sub.projectId });
    return this.findOne(id);
  }

  getChanges(id: number) {
    return this.changeRepo.find({
      where: { targetType: ChangeTargetType.SUBCONTRACT, targetId: id },
      order: { changeNo: 'ASC' },
    });
  }
}
