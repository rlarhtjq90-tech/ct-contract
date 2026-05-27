import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum ChangeTargetType {
  PROJECT = 'project',
  SUBCONTRACT = 'subcontract',
}

@Entity('contract_changes')
export class ContractChange {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'target_type', type: 'simple-enum', enum: ChangeTargetType })
  targetType: ChangeTargetType;

  @Column({ name: 'target_id' })
  targetId: number;

  @Column({ name: 'change_no', default: 1 })
  changeNo: number;

  @Column({ name: 'before_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  beforeAmount: number;

  @Column({ name: 'delta_amount', type: 'decimal', precision: 15, scale: 0 })
  deltaAmount: number;

  @Column({ name: 'after_amount', type: 'decimal', precision: 15, scale: 0 })
  afterAmount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
