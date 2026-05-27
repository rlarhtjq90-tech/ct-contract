import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('monthly_snapshots')
export class MonthlySnapshot {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'snapshot_month', length: 7, unique: true })
  snapshotMonth: string; // "YYYY-MM"

  @Column({ name: 'metrics_json', type: 'simple-json' })
  metricsJson: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
