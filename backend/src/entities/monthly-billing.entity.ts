import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Subcontract } from './subcontract.entity';

export enum BillingStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('monthly_billings')
@Index(['subcontractId', 'billingMonth'], { unique: true })
export class MonthlyBilling {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'subcontract_id' })
  subcontractId: number;

  @ManyToOne(() => Subcontract, (s) => s.billings)
  @JoinColumn({ name: 'subcontract_id' })
  subcontract: Subcontract;

  @Column({ name: 'billing_month' })
  billingMonth: string; // "YYYY-MM"

  @Column({ name: 'planned_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  plannedAmount: number;

  @Column({ name: 'actual_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  actualAmount: number;

  @Column({ name: 'cumulative_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  cumulativeAmount: number;

  @Column({ name: 'progress_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressRate: number;

  @Column({ type: 'simple-enum', enum: BillingStatus, default: BillingStatus.PENDING })
  status: BillingStatus;

  @Column({ name: 'is_anomaly', default: false })
  isAnomaly: boolean;

  @Column({ name: 'anomaly_reason', nullable: true })
  anomalyReason: string;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  memo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
