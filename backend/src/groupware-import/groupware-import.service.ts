import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  GroupwareDocument, GroupwareImportLine, ImportLineType, ImportMatchStatus,
} from '../entities/groupware-import.entity';
import { Project } from '../entities/project.entity';
import { Subcontract } from '../entities/subcontract.entity';
import { BillingsService } from '../billings/billings.service';

export class ImportLineDto {
  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsString() description?: string;
  @IsString() vendorName: string;
  @IsString() siteName: string;
  @IsOptional() @IsDateString() transactionDate?: string;
  @IsOptional() @IsDateString() paymentRequestDate?: string;
  @IsNumber() supplyAmount: number;
  @IsOptional() @IsNumber() vat?: number;
  @IsNumber() totalAmount: number;
}

export class ImportDocumentDto {
  @IsString() externalKey: string;
  @IsString() title: string;
  @IsString() docType: string;
  @IsOptional() @IsDateString() draftDate?: string;
  @IsOptional() @IsDateString() approvedAt?: string;
  @IsOptional() @IsString() approver?: string;
  @IsNumber() totalAmount: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportLineDto)
  lines: ImportLineDto[];
}

export class ImportPayloadDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportDocumentDto)
  documents: ImportDocumentDto[];
}

/** 외부 텍스트 비교용 정규화: 공백·법인 접두어·특수문자 제거 */
function normalize(s: string): string {
  return (s || '')
    .replace(/주식회사|\(주\)|㈜|㈱|\s+/g, '')
    .toLowerCase();
}

function fuzzyIncludes(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

@Injectable()
export class GroupwareImportService {
  constructor(
    @InjectRepository(GroupwareDocument) private docRepo: Repository<GroupwareDocument>,
    @InjectRepository(GroupwareImportLine) private lineRepo: Repository<GroupwareImportLine>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Subcontract) private subcontractRepo: Repository<Subcontract>,
    private billingsService: BillingsService,
  ) {}

  async importDocuments(payload: ImportPayloadDto) {
    const summary = { received: payload.documents.length, skippedExisting: 0, imported: 0, autoMatched: 0, needsReview: 0 };

    for (const docDto of payload.documents) {
      const exists = await this.docRepo.findOne({ where: { externalKey: docDto.externalKey } });
      if (exists) {
        summary.skippedExisting += 1;
        continue;
      }

      const doc = await this.docRepo.save(
        this.docRepo.create({
          externalKey: docDto.externalKey,
          title: docDto.title,
          docType: docDto.docType,
          draftDate: docDto.draftDate ? new Date(docDto.draftDate) : undefined,
          approvedAt: docDto.approvedAt ? new Date(docDto.approvedAt) : undefined,
          approver: docDto.approver,
          totalAmount: docDto.totalAmount,
        }),
      );
      summary.imported += 1;

      // 문서 안 여러 줄을 순차 처리 (같은 하도급계약+월로 모이는 금액이 누적 합산되도록)
      for (const lineDto of docDto.lines) {
        const classifiedType = this.classify(docDto.title, lineDto.description);

        const line = this.lineRepo.create({
          documentId: doc.id,
          purpose: lineDto.purpose,
          description: lineDto.description,
          vendorName: lineDto.vendorName,
          siteName: lineDto.siteName,
          transactionDate: lineDto.transactionDate ? new Date(lineDto.transactionDate) : undefined,
          paymentRequestDate: lineDto.paymentRequestDate ? new Date(lineDto.paymentRequestDate) : undefined,
          supplyAmount: lineDto.supplyAmount,
          vat: lineDto.vat ?? 0,
          totalAmount: lineDto.totalAmount,
          classifiedType,
          matchStatus: ImportMatchStatus.NEEDS_REVIEW,
        });

        if (classifiedType === ImportLineType.SUBCONTRACT_BILLING) {
          const subcontract = await this.findUniqueSubcontract(lineDto.siteName, lineDto.vendorName);
          const billingMonth = this.resolveBillingMonth(lineDto.paymentRequestDate, lineDto.transactionDate);

          if (subcontract && billingMonth) {
            const billing = await this.billingsService.upsertFromExternal(
              subcontract.id,
              billingMonth,
              Number(lineDto.supplyAmount),
            );
            line.matchStatus = ImportMatchStatus.AUTO_MATCHED;
            line.matchedSubcontractId = subcontract.id;
            line.appliedBillingId = billing!.id;
            summary.autoMatched += 1;
          } else {
            summary.needsReview += 1;
          }
        } else {
          summary.needsReview += 1;
        }

        await this.lineRepo.save(line);
      }
    }

    return summary;
  }

  private classify(title: string, description?: string): ImportLineType {
    const text = `${title} ${description || ''}`;
    return text.includes('기성') ? ImportLineType.SUBCONTRACT_BILLING : ImportLineType.OTHER;
  }

  private resolveBillingMonth(paymentRequestDate?: string, transactionDate?: string): string | null {
    const basis = paymentRequestDate || transactionDate;
    if (!basis) return null;
    return basis.slice(0, 7); // "YYYY-MM-DD" → "YYYY-MM"
  }

  /** siteName → Project, vendorName → 그 Project 소속 Subcontract 가 유일하게 좁혀질 때만 반환 */
  private async findUniqueSubcontract(siteName: string, vendorName: string): Promise<Subcontract | null> {
    const projects = await this.projectRepo.find();
    const projectCandidates = projects.filter((p) => fuzzyIncludes(p.name, siteName));
    if (projectCandidates.length !== 1) return null;

    const subcontracts = await this.subcontractRepo.find({
      where: { projectId: projectCandidates[0].id },
      relations: { subcontractor: true },
    });
    const subCandidates = subcontracts.filter((s) => fuzzyIncludes(s.subcontractor?.name || '', vendorName));
    if (subCandidates.length !== 1) return null;

    return subCandidates[0];
  }

  async getReviewQueue() {
    const lines = await this.lineRepo.find({
      where: { matchStatus: ImportMatchStatus.NEEDS_REVIEW },
      relations: { document: true },
      order: { createdAt: 'DESC' },
    });

    const projects = await this.projectRepo.find();
    const subcontracts = await this.subcontractRepo.find({ relations: { subcontractor: true, project: true } });

    return lines.map((line) => {
      const candidates = subcontracts.filter(
        (s) => fuzzyIncludes(s.project?.name || '', line.siteName)
          || fuzzyIncludes(s.subcontractor?.name || '', line.vendorName),
      );
      return { ...line, candidates };
    });
  }

  async applyLine(lineId: number, subcontractId: number, billingMonth: string) {
    const line = await this.lineRepo.findOne({ where: { id: lineId } });
    if (!line) return null;

    const billing = await this.billingsService.upsertFromExternal(
      subcontractId,
      billingMonth,
      Number(line.supplyAmount),
    );

    line.matchStatus = ImportMatchStatus.APPLIED;
    line.matchedSubcontractId = subcontractId;
    line.appliedBillingId = billing!.id;
    return this.lineRepo.save(line);
  }

  async ignoreLine(lineId: number, note: string = '') {
    const line = await this.lineRepo.findOne({ where: { id: lineId } });
    if (!line) return null;
    line.matchStatus = ImportMatchStatus.IGNORED;
    line.reviewNote = note;
    return this.lineRepo.save(line);
  }

  async getSummary() {
    const [autoMatched, needsReview, applied, ignored] = await Promise.all([
      this.lineRepo.count({ where: { matchStatus: ImportMatchStatus.AUTO_MATCHED } }),
      this.lineRepo.count({ where: { matchStatus: ImportMatchStatus.NEEDS_REVIEW } }),
      this.lineRepo.count({ where: { matchStatus: ImportMatchStatus.APPLIED } }),
      this.lineRepo.count({ where: { matchStatus: ImportMatchStatus.IGNORED } }),
    ]);
    return { autoMatched, needsReview, applied, ignored };
  }
}
