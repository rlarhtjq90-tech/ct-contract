import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum NotificationType {
  REGISTRATION_DUE = 'registration_due',
  BILLING_MISSING = 'billing_missing',
  REVIEW_PENDING = 'review_pending',
  ANOMALY = 'anomaly',
  CONTRACT_EXPIRY = 'contract_expiry',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'simple-enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'ref_id', nullable: true })
  refId: number;

  @Column({ name: 'ref_type', nullable: true })
  refType: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'target_user_id', nullable: true })
  targetUserId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
