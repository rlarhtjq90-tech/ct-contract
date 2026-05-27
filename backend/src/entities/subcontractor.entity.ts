import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { Subcontract } from './subcontract.entity';

@Entity('subcontractors')
export class Subcontractor {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'business_no', length: 20, nullable: true })
  businessNo: string;

  @Column({ name: 'work_type', length: 60, nullable: true })
  workType: string;

  @Column({ name: 'license_info', type: 'simple-json', nullable: true })
  licenseInfo: Record<string, any>;

  @Column({ name: 'contact_info', type: 'simple-json', nullable: true })
  contactInfo: Record<string, any>;

  @Column({ name: 'credit_rating', length: 10, nullable: true })
  creditRating: string;

  @Column({ nullable: true })
  memo: string;

  @OneToMany(() => Subcontract, (sub) => sub.subcontractor)
  subcontracts: Subcontract[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
