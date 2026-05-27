import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
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
    await this.repo.delete(id);
  }
}
