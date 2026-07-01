import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    const defaultUsers = [
      { email: 'admin@ct.co.kr', name: '시스템 관리자', role: UserRole.ADMIN },
      { email: 'pm@ct.co.kr',    name: '프로젝트 매니저', role: UserRole.PM },
      { email: 'viewer@ct.co.kr', name: '열람 사용자',   role: UserRole.VIEWER },
    ];
    const hash = await bcrypt.hash('ct1234!', 10);
    for (const u of defaultUsers) {
      const exists = await this.userRepo.findOne({ where: { email: u.email } });
      if (!exists) {
        await this.userRepo.save({ ...u, passwordHash: hash });
        console.log(`✅ 계정 생성: ${u.email} (${u.role})`);
      }
    }
  }

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  findAll() {
    return this.userRepo.find({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ email: dto.email, name: dto.name, role: dto.role, passwordHash });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, refreshToken: __, ...safe } = saved;
    return safe;
  }

  async update(id: number, dto: UpdateUserDto, requesterId: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (requesterId === id && dto.role !== undefined && dto.role !== user.role) {
      throw new ForbiddenException('자신의 역할은 변경할 수 없습니다.');
    }

    const patch: Partial<User> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.role !== undefined) patch.role = dto.role;
    await this.userRepo.update(id, patch);

    const updated = await this.userRepo.findOne({ where: { id } });
    const { passwordHash: _, refreshToken: __, ...safe } = updated!;
    return safe;
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(id, { passwordHash, refreshToken: null });
    return { success: true };
  }

  async remove(id: number, requesterId: number) {
    if (id === requesterId) throw new BadRequestException('자신의 계정은 삭제할 수 없습니다.');

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) throw new BadRequestException('마지막 관리자 계정은 삭제할 수 없습니다.');
    }

    await this.userRepo.delete(id);
    return { success: true };
  }
}
