import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MonthlyBilling, BillingStatus } from '../entities/monthly-billing.entity';
import { Subcontract } from '../entities/subcontract.entity';

@Injectable()
export class BillingsService {
  constructor(
    @InjectRepository(MonthlyBilling) private repo: Repository<MonthlyBilling>,
    @InjectRepository(Subcontract) private subRepo: Repository<Subcontract>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findByMonth(month: string) {
    // 해당 월 데이터가 없는 하도급계약에 대해 자동 생성
    const subcontracts = await this.subRepo.find({
      relations: { subcontractor: true, project: true },
    });

    for (const sub of subcontracts) {
      const exists = await this.repo.findOne({
        where: { subcontractId: sub.id, billingMonth: month },
      });
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            subcontractId: sub.id,
            billingMonth: month,
            status: BillingStatus.PENDING,
          }),
        );
      }
    }

    const billings = await this.repo.find({
      where: { billingMonth: month },
      relations: { subcontract: { subcontractor: true, project: true } },
      order: { subcontractId: 'ASC' },
    });

    // 모든 행(approved 포함)의 cumulativeAmount를 이전 승인 합계 기반으로 실시간 보정
    // → 역순 승인(3월 먼저 approve 후 2월 approve 등)에도 전회금액이 항상 정확하게 표시됨
    for (const billing of billings) {
      const prevResult = await this.repo
        .createQueryBuilder('b')
        .where('b.subcontract_id = :sid', { sid: billing.subcontractId })
        .andWhere('b.billing_month < :month', { month })
        .andWhere('b.status = :status', { status: BillingStatus.APPROVED })
        .select('SUM(b.actual_amount)', 'total')
        .getRawOne();
      const prevTotal = Number(prevResult?.total || 0);
      billing.cumulativeAmount = prevTotal + Number(billing.actualAmount);
    }

    return billings;
  }

  async bulkUpdate(updates: Array<{ id: number; plannedAmount?: number; actualAmount?: number; memo?: string }>) {
    const results: MonthlyBilling[] = [];
    for (const update of updates) {
      const billing = await this.repo.findOne({
        where: { id: update.id },
        relations: { subcontract: true },
      });
      if (!billing) continue;

      const newActual = update.actualAmount ?? Number(billing.actualAmount);
      const fields = await this.computeBillingFields(billing, newActual);

      await this.repo.update(update.id, {
        plannedAmount: update.plannedAmount ?? billing.plannedAmount,
        actualAmount: newActual,
        memo: update.memo ?? billing.memo,
        ...fields,
      });

      const updated = await this.repo.findOne({ where: { id: update.id } });
      if (updated) results.push(updated);
    }
    return results;
  }

  /** (subcontractId, billingMonth) 행이 없으면 PENDING으로 생성 후 반환 */
  private async ensureRow(subcontractId: number, billingMonth: string): Promise<MonthlyBilling> {
    let billing = await this.repo.findOne({
      where: { subcontractId, billingMonth },
      relations: { subcontract: true },
    });
    if (!billing) {
      const saved = await this.repo.save(
        this.repo.create({ subcontractId, billingMonth, status: BillingStatus.PENDING }),
      );
      billing = await this.repo.findOne({ where: { id: saved.id }, relations: { subcontract: true } });
    }
    return billing!;
  }

  /** 누적기성액·기성률·이상치 여부를 계산 (bulkUpdate와 외부연동 반영이 공유) */
  private async computeBillingFields(billing: MonthlyBilling, newActual: number) {
    const prevResult = await this.repo
      .createQueryBuilder('b')
      .where('b.subcontract_id = :sid', { sid: billing.subcontractId })
      .andWhere('b.billing_month < :month', { month: billing.billingMonth })
      .andWhere('b.status = :status', { status: BillingStatus.APPROVED })
      .select('SUM(b.actual_amount)', 'total')
      .getRawOne();

    const prevTotal = Number(prevResult?.total || 0);
    const cumulative = prevTotal + newActual;
    const contractAmount = Number(billing.subcontract?.currentAmount || 0);
    const progressRate = contractAmount > 0 ? (cumulative / contractAmount) * 100 : 0;

    let isAnomaly = false;
    let anomalyReason = '';
    const prevMonthBilling = await this.getPrevMonthBilling(billing.subcontractId, billing.billingMonth);
    const prevActual = prevMonthBilling ? Number(prevMonthBilling.actualAmount) : 0;
    if (prevActual > 0 && newActual > 0) {
      const changeRate = Math.abs((newActual - prevActual) / prevActual);
      if (changeRate > 0.3) {
        isAnomaly = true;
        anomalyReason = `전월 대비 ${(changeRate * 100).toFixed(0)}% 변동 (전월: ${prevActual.toLocaleString()}원)`;
      }
    }

    return {
      cumulativeAmount: cumulative,
      progressRate: Math.min(progressRate, 999.99),
      isAnomaly,
      anomalyReason,
    };
  }

  /**
   * 외부(그룹웨어) 연동에서 호출: 해당 월 기성액에 금액을 더해 반영.
   * 같은 월에 여러 건(예: 기성 + 기지급)이 들어오면 누적 합산됨.
   */
  async upsertFromExternal(subcontractId: number, billingMonth: string, amountToAdd: number) {
    const billing = await this.ensureRow(subcontractId, billingMonth);
    const newActual = Number(billing.actualAmount) + amountToAdd;
    const fields = await this.computeBillingFields(billing, newActual);

    await this.repo.update(billing.id, {
      actualAmount: newActual,
      status: BillingStatus.SUBMITTED,
      ...fields,
    });

    return this.repo.findOne({ where: { id: billing.id } });
  }

  async approve(id: number, approvedBy: string) {
    const billing = await this.repo.findOne({
      where: { id },
      relations: { subcontract: true },
    });
    if (!billing) throw new NotFoundException('기성을 찾을 수 없습니다.');

    await this.repo.update(id, {
      status: BillingStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy,
    });

    // 이후 달 approved 레코드 cumulativeAmount·progressRate DB 재계산
    await this.recalcFutureBillings(
      billing.subcontractId,
      billing.billingMonth,
      Number(billing.subcontract?.currentAmount || 0),
    );

    this.eventEmitter.emit('billing.approved', {
      billingId: id,
      subcontractId: billing.subcontractId,
      projectId: billing.subcontract?.projectId,
      month: billing.billingMonth,
    });

    return this.repo.findOne({ where: { id } });
  }

  async exportData(month: string) {
    const billingList = await this.findByMonth(month);
    return billingList.filter((b) => b.status === BillingStatus.APPROVED);
  }

  async deleteOrphans(): Promise<{ deleted: number }> {
    const subcontracts = await this.subRepo.find({ select: { id: true } });
    const existingIds = subcontracts.map((s) => s.id);
    if (existingIds.length === 0) {
      const all = await this.repo.find({ select: { id: true } });
      if (all.length === 0) return { deleted: 0 };
      await this.repo.delete(all.map((b) => b.id));
      return { deleted: all.length };
    }
    const orphans = await this.repo
      .createQueryBuilder('b')
      .where('b.subcontract_id NOT IN (:...ids)', { ids: existingIds })
      .select('b.id')
      .getMany();
    if (orphans.length === 0) return { deleted: 0 };
    await this.repo.delete(orphans.map((b) => b.id));
    return { deleted: orphans.length };
  }

  private async recalcFutureBillings(
    subcontractId: number,
    fromMonth: string,
    contractAmount: number,
  ) {
    const futureBillings = await this.repo.find({
      where: { subcontractId, status: BillingStatus.APPROVED },
      order: { billingMonth: 'ASC' },
    });

    for (const b of futureBillings) {
      if (b.billingMonth <= fromMonth) continue;

      const prevResult = await this.repo
        .createQueryBuilder('b')
        .where('b.subcontract_id = :sid', { sid: b.subcontractId })
        .andWhere('b.billing_month < :month', { month: b.billingMonth })
        .andWhere('b.status = :status', { status: BillingStatus.APPROVED })
        .select('SUM(b.actual_amount)', 'total')
        .getRawOne();

      const prevTotal = Number(prevResult?.total || 0);
      const newCumulative = prevTotal + Number(b.actualAmount);
      const progressRate = contractAmount > 0 ? (newCumulative / contractAmount) * 100 : 0;

      await this.repo.update(b.id, {
        cumulativeAmount: newCumulative,
        progressRate: Math.min(progressRate, 999.99),
      });
    }
  }

  private async getPrevMonthBilling(subcontractId: number, currentMonth: string) {
    const [year, mon] = currentMonth.split('-').map(Number);
    const prev = mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
    return this.repo.findOne({ where: { subcontractId, billingMonth: prev } });
  }
}
