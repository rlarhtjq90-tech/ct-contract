import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { User } from './entities/user.entity';
import { Client } from './entities/client.entity';
import { Project } from './entities/project.entity';
import { Subcontractor } from './entities/subcontractor.entity';
import { Subcontract } from './entities/subcontract.entity';
import { MonthlyBilling } from './entities/monthly-billing.entity';
import { ContractChange } from './entities/contract-change.entity';
import { ProjectMetric } from './entities/project-metric.entity';
import { MonthlySnapshot } from './entities/monthly-snapshot.entity';
import { Notification } from './entities/notification.entity';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { SubcontractsModule } from './subcontracts/subcontracts.module';
import { BillingsModule } from './billings/billings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { GatewayModule } from './gateway/gateway.module';

const ENTITIES = [
  User, Client, Project, Subcontractor, Subcontract,
  MonthlyBilling, ContractChange, ProjectMetric,
  MonthlySnapshot, Notification,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // SQLite (sql.js) — 개발 환경 DB 설치 불필요
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: 'ct_contract_dev.db',
      autoSave: true,
      entities: ENTITIES,
      synchronize: true,
      logging: false,
    }),

    EventEmitterModule.forRoot(),

    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    SubcontractorsModule,
    SubcontractsModule,
    BillingsModule,
    DashboardModule,
    MetricsModule,
    NotificationsModule,
    SnapshotsModule,
    GatewayModule,
  ],
})
export class AppModule {}
