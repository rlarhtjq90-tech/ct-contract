import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';

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
    });
  }
}
