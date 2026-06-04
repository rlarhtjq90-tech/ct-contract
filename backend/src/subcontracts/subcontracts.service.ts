import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { format } from 'date-fns';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling, BillingStatus } from '../entities/monthly-billing.entity';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';
import { DeleteRequest } from '../entities/delete-request.entity';
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

export class UpdateSubcontractDto {
  @IsOptional() @IsString() contractNo?: string;
  @IsOptional() @IsString() workScope?: string;
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
    @InjectRepository(DeleteRequest) private deleteRequestRepo: Repository<DeleteRequest>,
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

  async update(id: number, dto: UpdateSubcontractDto) {
    const patch: any = {};
    if (dto.contractNo !== undefined) patch.contractNo = dto.contractNo;
    if (dto.workScope  !== undefined) patch.workScope  = dto.workScope;
    if (dto.contractDate) patch.contractDate = new Date(dto.contractDate);
    if (dto.startDate)    patch.startDate    = new Date(dto.startDate);
    if (dto.endDate)      patch.endDate      = new Date(dto.endDate);
    await this.repo.update(id, patch);
    return this.findOne(id);
  }

  async addChange(id: number, afterAmount: number, reason: string, createdBy: string, effectiveDate?: string) {
    const sub    = await this.findOne(id);
    const before = Number(sub.currentAmount);
    const delta  = afterAmount - before;     // 증감액 자동 계산
    const lastChange = await this.changeRepo.count({
      where: { targetType: ChangeTargetType.SUBCONTRACT, targetId: id },
    });
    await this.changeRepo.save(
      this.changeRepo.create({
        targetType: ChangeTargetType.SUBCONTRACT,
        targetId: id,
        changeNo: lastChange + 1,
        beforeAmount: before,
        deltaAmount: delta,
        afterAmount,
        reason,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        createdBy,
      }),
    );
    await this.repo.update(id, { currentAmount: afterAmount });
    this.eventEmitter.emit('subcontract.changed', { subcontractId: id, projectId: sub.projectId });
    return this.findOne(id);
  }

  getChanges(id: number) {
    return this.changeRepo.find({
      where: { targetType: ChangeTargetType.SUBCONTRACT, targetId: id },
      order: { changeNo: 'ASC' },
    });
  }

  async remove(id: number) {
    // 연관 데이터 먼저 삭제 (cascade)
    await this.billingRepo.delete({ subcontractId: id });                                       // 하도급 기성현황
    await this.changeRepo.delete({ targetType: ChangeTargetType.SUBCONTRACT, targetId: id });   // 계약변경 이력
    await this.deleteRequestRepo.delete({ targetType: 'subcontract', targetId: id });           // 삭제요청 이력
    await this.repo.delete(id);
    return { success: true };
  }

  async deleteOrphans(): Promise<{ deleted: number }> {
    // 존재하지 않는 도급계약을 참조하는 하도급계약 + 연관 데이터 전체 삭제
    const orphans = await this.repo
      .createQueryBuilder('s')
      .leftJoin('projects', 'p', 'p.id = s.project_id')
      .where('p.id IS NULL')
      .select('s.id')
      .getMany();

    if (orphans.length === 0) return { deleted: 0 };

    const ids = orphans.map((s) => s.id);
    await this.billingRepo
      .createQueryBuilder()
      .delete()
      .where('subcontract_id IN (:...ids)', { ids })
      .execute();
    await this.changeRepo
      .createQueryBuilder()
      .delete()
      .where('target_type = :type AND target_id IN (:...ids)', { type: ChangeTargetType.SUBCONTRACT, ids })
      .execute();
    await this.deleteRequestRepo
      .createQueryBuilder()
      .delete()
      .where('target_type = :type AND target_id IN (:...ids)', { type: 'subcontract', ids })
      .execute();
    await this.repo.delete(ids);
    return { deleted: ids.length };
  }
}
