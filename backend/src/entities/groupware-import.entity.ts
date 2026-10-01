import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Subcontract } from './subcontract.entity';
import { MonthlyBilling } from './monthly-billing.entity';

export enum ImportLineType {
  SUBCONTRACT_BILLING = 'subcontract_billing',
  OTHER = 'other',
}

export enum ImportMatchStatus {
  AUTO_MATCHED = 'auto_matched',
  NEEDS_REVIEW = 'needs_review',
  IGNORED = 'ignored',
  APPLIED = 'applied',
}

/** 그룹웨어 전자결재 "자금신청(현장 외주비)" 문서 1건 (중복 수신 방지 단위) */
@Entity('groupware_documents')
export class GroupwareDocument {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'external_key', unique: true, length: 200 })
  externalKey: string;

  @Column({ length: 300 })
  title: string;

  @Column({ name: 'doc_type', length: 100 })
  docType: string;

  @Column({ name: 'draft_date', type: 'date', nullable: true })
  draftDate: Date;

  @Column({ name: 'approved_at', type: 'date', nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  approver: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  totalAmount: number;

  @OneToMany(() => GroupwareImportLine, (line) => line.document)
  lines: GroupwareImportLine[];

  @CreateDateColumn({ name: 'imported_at' })
  importedAt: Date;
}

/** 문서 안의 지출내역 한 줄 */
@Entity('groupware_import_lines')
@Index(['matchStatus'])
export class GroupwareImportLine {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'document_id' })
  documentId: number;

  @ManyToOne(() => GroupwareDocument, (d) => d.lines)
  @JoinColumn({ name: 'document_id' })
  document: GroupwareDocument;

  @Column({ nullable: true })
  purpose: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'vendor_name', length: 200 })
  vendorName: string;

  @Column({ name: 'site_name', length: 200 })
  siteName: string;

  @Column({ name: 'transaction_date', type: 'date', nullable: true })
  transactionDate: Date;

  @Column({ name: 'payment_request_date', type: 'date', nullable: true })
  paymentRequestDate: Date;

  @Column({ name: 'supply_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  supplyAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 0, default: 0 })
  vat: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 0, default: 0 })
  totalAmount: number;

  @Column({ name: 'classified_type', type: 'simple-enum', enum: ImportLineType, default: ImportLineType.OTHER })
  classifiedType: ImportLineType;

  @Column({ name: 'match_status', type: 'simple-enum', enum: ImportMatchStatus, default: ImportMatchStatus.NEEDS_REVIEW })
  matchStatus: ImportMatchStatus;

  @Column({ name: 'matched_subcontract_id', nullable: true })
  matchedSubcontractId: number;

  @ManyToOne(() => Subcontract, { nullable: true })
  @JoinColumn({ name: 'matched_subcontract_id' })
  matchedSubcontract: Subcontract;

  @Column({ name: 'applied_billing_id', nullable: true })
  appliedBillingId: number;

  @ManyToOne(() => MonthlyBilling, { nullable: true })
  @JoinColumn({ name: 'applied_billing_id' })
  appliedBilling: MonthlyBilling;

  @Column({ name: 'review_note', nullable: true })
  reviewNote: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
