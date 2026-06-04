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
import { DeleteRequest } from './entities/delete-request.entity';
import { ProjectBilling } from './entities/project-billing.entity';

import { AuthModule } from './auth/auth.module';
import { DeleteRequestsModule } from './delete-requests/delete-requests.module';
import { ProjectBillingsModule } from './project-billings/project-billings.module';
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
import { ContractChangesModule } from './contract-changes/contract-changes.module';
import { ReportsModule } from './reports/reports.module';

const ENTITIES = [
  User, Client, Project, Subcontractor, Subcontract,
  MonthlyBilling, ContractChange, ProjectMetric,
  MonthlySnapshot, Notification, DeleteRequest, ProjectBilling,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // DB: 프로덕션=PostgreSQL, 개발=SQLite(sql.js)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: ENTITIES,
            synchronize: true,
            ssl: { rejectUnauthorized: false },
            logging: false,
          } as any;
        }
        return {
          type: 'sqljs',
          location: 'ct_contract_dev.db',
          autoSave: true,
          entities: ENTITIES,
          synchronize: true,
          logging: false,
        } as any;
      },
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
    DeleteRequestsModule,
    ProjectBillingsModule,
    ContractChangesModule,
    ReportsModule,
  ],
})
export class AppModule {}
