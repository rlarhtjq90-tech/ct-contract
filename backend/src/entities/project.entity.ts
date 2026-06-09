import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Subcontract } from './subcontract.entity';

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => Client, (client) => client.projects)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ length: 200 })
  name: string;

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

  @Column({ type: 'simple-enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Subcontract, (sub) => sub.project)
  subcontracts: Subcontract[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
