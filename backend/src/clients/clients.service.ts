import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { Project } from '../entities/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { IsString, IsOptional } from 'class-validator';

export class CreateClientDto {
  @IsString() name: string;
  @IsOptional() @IsString() businessNo?: string;
  @IsOptional() @IsString() ceoName?: string;
  @IsOptional() contactInfo?: Record<string, any>;
  @IsOptional() @IsString() paymentTerms?: string;
  @IsOptional() @IsString() memo?: string;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private repo: Repository<Client>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    private projectsService: ProjectsService,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({
      where: { id },
      relations: { projects: true },
    });
    if (!c) throw new NotFoundException('발주처를 찾을 수 없습니다.');
    return c;
  }

  create(dto: CreateClientDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: number, dto: Partial<CreateClientDto>) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // 이 발주처에 속한 도급계약을 순서대로 cascade 삭제
    // (projects.service.ts의 remove()가 하도급계약·기성현황까지 처리)
    const projects = await this.projectRepo.find({
      where: { clientId: id },
      select: { id: true },
    });
    for (const project of projects) {
      await this.projectsService.remove(project.id);
    }
    await this.repo.delete(id);
    return { success: true };
  }
}
