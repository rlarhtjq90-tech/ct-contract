import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'business_no', length: 20, nullable: true })
  businessNo: string;

  @Column({ name: 'ceo_name', length: 40, nullable: true })
  ceoName: string;

  @Column({ name: 'contact_info', type: 'simple-json', nullable: true })
  contactInfo: Record<string, any>;

  @Column({ name: 'payment_terms', length: 60, nullable: true })
  paymentTerms: string;

  @Column({ nullable: true })
  memo: string;

  @OneToMany(() => Project, (project) => project.client)
  projects: Project[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
