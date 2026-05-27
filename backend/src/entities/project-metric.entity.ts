import {
  Entity, PrimaryColumn, Column, UpdateDateColumn,
} from 'typeorm';

// 이벤트 기반으로 갱신되는 집계 테이블 — 대시보드 전용
@Entity('project_metrics')
export class ProjectMetric {
  @PrimaryColumn({ name: 'project_id' })
  projectId: number;

  @Column({ name: 'total_subcontracts', default: 0 })
  totalSubcontracts: number;

  @Column({ name: 'active_subcontracts', default: 0 })
  activeSubcontracts: number;

  @Column({ name: 'total_subcontract_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  totalSubcontractAmount: number;

  @Column({ name: 'weighted_progress', type: 'decimal', precision: 5, scale: 2, default: 0 })
  weightedProgress: number;

  @Column({ name: 'delayed_count', default: 0 })
  delayedCount: number;

  @Column({ name: 'current_month_billing', type: 'decimal', precision: 15, scale: 0, default: 0 })
  currentMonthBilling: number;

  @Column({ name: 'total_approved_billing', type: 'decimal', precision: 15, scale: 0, default: 0 })
  totalApprovedBilling: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
