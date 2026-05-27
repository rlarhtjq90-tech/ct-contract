import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subcontractor } from '../entities/subcontractor.entity';
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
}
