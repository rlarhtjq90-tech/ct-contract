import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsListener {
  constructor(private metricsService: MetricsService) {}

  @OnEvent('subcontract.created')
  async onSubcontractCreated(payload: { projectId: number }) {
    await this.metricsService.recalculate(payload.projectId);
  }

  @OnEvent('subcontract.changed')
  async onSubcontractChanged(payload: { projectId: number }) {
    await this.metricsService.recalculate(payload.projectId);
  }

  @OnEvent('billing.approved')
  async onBillingApproved(payload: { projectId: number }) {
    await this.metricsService.recalculate(payload.projectId);
  }

  @OnEvent('project.changed')
  async onProjectChanged(payload: { projectId: number }) {
    await this.metricsService.recalculate(payload.projectId);
  }
}
