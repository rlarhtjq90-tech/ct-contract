import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Subcontractor } from './subcontractor.entity';
import { MonthlyBilling } from './monthly-billing.entity';

export enum SubcontractStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

@Entity('subcontracts')
export class Subcontract {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, (p) => p.subcontracts)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'subcontractor_id' })
  subcontractorId: number;

  @ManyToOne(() => Subcontractor, (s) => s.subcontracts)
  @JoinColumn({ name: 'subcontractor_id' })
  subcontractor: Subcontractor;

  @Column({ name: 'contract_no', length: 40, nullable: true })
  contractNo: string;

  @Column({ name: 'work_scope', type: 'text', nullable: true })
  workScope: string;

  @Column({ name: 'contract_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  contractAmount: number;

  @Column({ name: 'current_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  currentAmount: number;

  @Column({ name: 'contract_date', type: 'date', nullable: true })
  contractDate: Date;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'simple-enum', enum: SubcontractStatus, default: SubcontractStatus.ACTIVE })
  status: SubcontractStatus;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @OneToMany(() => MonthlyBilling, (b) => b.subcontract)
  billings: MonthlyBilling[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
