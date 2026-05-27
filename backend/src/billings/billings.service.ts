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

  findByMonth(month: string) {
    return this.repo.find({
      where: { billingMonth: month },
      relations: { subcontract: { subcontractor: true, project: true } },
      order: { subcontractId: 'ASC' },
    });
  }

  async bulkUpdate(updates: Array<{ id: number; plannedAmount?: number; actualAmount?: number; memo?: string }>) {
    const results: MonthlyBilling[] = [];
    for (const update of updates) {
      const billing = await this.repo.findOne({
        where: { id: update.id },
        relations: { subcontract: true },
      });
      if (!billing) continue;

      // 누적 기성액 계산
      const prevResult = await this.repo
        .createQueryBuilder('b')
        .where('b.subcontract_id = :sid', { sid: billing.subcontractId })
        .andWhere('b.billing_month < :month', { month: billing.billingMonth })
        .andWhere('b.status = :status', { status: BillingStatus.APPROVED })
        .select('SUM(b.actual_amount)', 'total')
        .getRawOne();

      const prevTotal = Number(prevResult?.total || 0);
      const newActual = update.actualAmount ?? Number(billing.actualAmount);
      const cumulative = prevTotal + newActual;
      const contractAmount = Number(billing.subcontract?.currentAmount || 0);
      const progressRate = contractAmount > 0 ? (cumulative / contractAmount) * 100 : 0;

      // 이상치 감지: 전월 대비 ±30%
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

      await this.repo.update(update.id, {
        plannedAmount: update.plannedAmount ?? billing.plannedAmount,
        actualAmount: newActual,
        cumulativeAmount: cumulative,
        progressRate: Math.min(progressRate, 999.99),
        isAnomaly,
        anomalyReason,
        memo: update.memo ?? billing.memo,
        status: BillingStatus.SUBMITTED,
      });

      const updated = await this.repo.findOne({ where: { id: update.id } });
      if (updated) results.push(updated);
    }
    return results;
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

  private async getPrevMonthBilling(subcontractId: number, currentMonth: string) {
    const [year, mon] = currentMonth.split('-').map(Number);
    const prev = mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
    return this.repo.findOne({ where: { subcontractId, billingMonth: prev } });
  }
}
