import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subcontractor } from '../entities/subcontractor.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { MonthlyBilling } from '../entities/monthly-billing.entity';
import { ContractChange, ChangeTargetType } from '../entities/contract-change.entity';
import { DeleteRequest } from '../entities/delete-request.entity';
import { IsString, IsOptional } from 'class-validator';

export class CreateSubcontractorDto {
  @IsString() name: string;
  @IsOptional() @IsString() businessNo?: string;
  @IsOptional() @IsString() workType?: string;
  @IsOptional() licenseInfo?: Record<string, any>;
  @IsOptional() contactInfo?: Record<string, any>;
  @IsOptional() @IsString() creditRating?: string;
  @IsOptional() @IsString() memo?: string;
}

@Injectable()
export class SubcontractorsService {
  constructor(
    @InjectRepository(Subcontractor) private repo: Repository<Subcontractor>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
    @InjectRepository(MonthlyBilling) private billingRepo: Repository<MonthlyBilling>,
    @InjectRepository(ContractChange) private changeRepo: Repository<ContractChange>,
    @InjectRepository(DeleteRequest) private deleteRequestRepo: Repository<DeleteRequest>,
  ) {}

  findAll() { return this.repo.find({ order: { name: 'ASC' } }); }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id }, relations: { subcontracts: true } });
    if (!s) throw new NotFoundException('하도급사를 찾을 수 없습니다.');
    return s;
  }

  create(dto: CreateSubcontractorDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<CreateSubcontractorDto>) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // 연관된 하도급계약 목록 조회
    const subs = await this.subcontractRepo.find({ where: { subcontractorId: id }, select: { id: true } });
    if (subs.length > 0) {
      const subIds = subs.map((s) => s.id);
      // 하도급 기성현황 삭제
      await this.billingRepo.createQueryBuilder().delete()
        .where('subcontract_id IN (:...ids)', { ids: subIds }).execute();
      // 변경계약 이력 삭제
      await this.changeRepo.createQueryBuilder().delete()
        .where('target_type = :type AND target_id IN (:...ids)', { type: ChangeTargetType.SUBCONTRACT, ids: subIds }).execute();
      // 삭제요청 이력 삭제
      await this.deleteRequestRepo.createQueryBuilder().delete()
        .where('target_type = :type AND target_id IN (:...ids)', { type: 'subcontract', ids: subIds }).execute();
      // 하도급계약 삭제
      await this.subcontractRepo.delete(subIds);
    }
    await this.repo.delete(id);
    return { success: true };
  }
}
