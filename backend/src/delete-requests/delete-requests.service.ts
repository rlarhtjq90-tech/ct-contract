import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DeleteRequest, DeleteRequestStatus } from '../entities/delete-request.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';

export class CreateDeleteRequestDto {
  @IsString()
  targetType: string;

  @IsNumber()
  @Type(() => Number)
  targetId: number;

  @IsString()
  targetName: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Injectable()
export class DeleteRequestsService {
  constructor(
    @InjectRepository(DeleteRequest) private repo: Repository<DeleteRequest>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findPending() {
    return this.repo.find({
      where: { status: DeleteRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  create(dto: CreateDeleteRequestDto, requestedBy: string) {
    const req = this.repo.create({ ...dto, requestedBy, status: DeleteRequestStatus.PENDING });
    return this.repo.save(req);
  }

  async approve(id: number) {
    const req = await this.repo.findOne({ where: { id } });
    if (!req) throw new NotFoundException('삭제 요청을 찾을 수 없습니다.');

    if (req.targetType === 'project') {
      await this.projectRepo.delete(req.targetId);
    } else if (req.targetType === 'subcontract') {
      await this.subcontractRepo.delete(req.targetId);
    }

    await this.repo.update(id, { status: DeleteRequestStatus.APPROVED });
    return { success: true, message: '삭제 승인 완료' };
  }

  async reject(id: number) {
    const req = await this.repo.findOne({ where: { id } });
    if (!req) throw new NotFoundException('삭제 요청을 찾을 수 없습니다.');
    await this.repo.update(id, { status: DeleteRequestStatus.REJECTED });
    return { success: true, message: '삭제 요청 거절' };
  }
}
