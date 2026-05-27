import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DeleteRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('delete_requests')
export class DeleteRequest {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'target_type' }) // 'project' | 'subcontract'
  targetType: string;

  @Column({ name: 'target_id' })
  targetId: number;

  @Column({ name: 'target_name' })
  targetName: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'simple-enum', enum: DeleteRequestStatus, default: DeleteRequestStatus.PENDING })
  status: DeleteRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
