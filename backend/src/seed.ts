/**
 * CT 계약관리시스템 시드 데이터
 * 발주처 3, 프로젝트 5, 하도급사 10, 하도급계약 20, 월별기성 60건
 * 실행: npx ts-node -r tsconfig-paths/register src/seed.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Client } from './entities/client.entity';
import { Project, ProjectStatus } from './entities/project.entity';
import { Subcontractor } from './entities/subcontractor.entity';
import { Subcontract, SubcontractStatus } from './entities/subcontract.entity';
import { MonthlyBilling, BillingStatus } from './entities/monthly-billing.entity';
import { ProjectMetric } from './entities/project-metric.entity';

const AppDataSource = new DataSource({
  type: 'sqljs',
  location: 'ct_contract_dev.db',
  autoSave: true,
  entities: [User, Client, Project, Subcontractor, Subcontract, MonthlyBilling, ProjectMetric],
  synchronize: false,
  logging: false,
} as any);

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ DB 연결 완료');

  // ─────────────────────────────────────────
  // 발주처 3개
  // ─────────────────────────────────────────
  const clientRepo = AppDataSource.getRepository(Client);
  const clientsData = [
    { name: '한국도로공사', businessNo: '201-81-12345', ceoName: '김도로', paymentTerms: '익월 말일', memo: '고속도로 건설 발주처' },
    { name: '서울특별시청', businessNo: '101-83-04256', ceoName: '오세훈', paymentTerms: '당월 25일', memo: '도시기반시설 발주' },
    { name: '한국수자원공사', businessNo: '130-81-00111', ceoName: '박수공', paymentTerms: '익월 15일', memo: '수도권 상수도 공사' },
  ];
  const clients: Client[] = [];
  for (const c of clientsData) {
    let existing = await clientRepo.findOneBy({ businessNo: c.businessNo });
    if (!existing) {
      existing = clientRepo.create(c);
      await clientRepo.save(existing);
    }
    clients.push(existing);
  }
  console.log(`✅ 발주처 ${clients.length}개 생성`);

  // ─────────────────────────────────────────
  // 도급계약(프로젝트) 5개
  // ─────────────────────────────────────────
  const projectRepo = AppDataSource.getRepository(Project);
  const projectsData = [
    {
      client: clients[0], projectCode: 'P2025-001', name: '경부고속도로 4차로 확장공사 1공구',
      contractAmount: 12_000_000_000, currentAmount: 12_000_000_000,
      startDate: new Date('2025-01-15'), endDate: new Date('2027-06-30'), status: ProjectStatus.ACTIVE,
      description: '경부고속도로 천안~청주 구간 4차로 확장',
    },
    {
      client: clients[0], projectCode: 'P2025-002', name: '서해안고속도로 교량 보강공사',
      contractAmount: 5_800_000_000, currentAmount: 5_800_000_000,
      startDate: new Date('2025-03-01'), endDate: new Date('2026-08-31'), status: ProjectStatus.ACTIVE,
      description: '서해안선 제3교량 내진보강 및 상판 교체',
    },
    {
      client: clients[1], projectCode: 'P2024-003', name: '서울 은평구 도시재생 뉴딜사업',
      contractAmount: 8_500_000_000, currentAmount: 8_500_000_000,
      startDate: new Date('2024-07-01'), endDate: new Date('2026-12-31'), status: ProjectStatus.ACTIVE,
      description: '은평구 노후 불량건축물 정비 및 기반시설 개선',
    },
    {
      client: clients[2], projectCode: 'P2024-004', name: '수도권 광역상수도 3단계 관로 정비',
      contractAmount: 3_200_000_000, currentAmount: 3_200_000_000,
      startDate: new Date('2024-04-01'), endDate: new Date('2025-09-30'), status: ProjectStatus.COMPLETED,
      description: '광역상수도 노후 관로 교체 및 수질 개선',
    },
    {
      client: clients[1], projectCode: 'P2026-005', name: '강남구 지하차도 신설공사',
      contractAmount: 15_000_000_000, currentAmount: 15_000_000_000,
      startDate: new Date('2026-02-01'), endDate: new Date('2028-12-31'), status: ProjectStatus.ACTIVE,
      description: '개포동 지하차도 신설 및 지하 주차장 조성',
    },
  ];
  const projects: Project[] = [];
  for (const p of projectsData) {
    let existing = await projectRepo.findOneBy({ projectCode: p.projectCode });
    if (!existing) {
      existing = projectRepo.create(p);
      await projectRepo.save(existing);
    }
    projects.push(existing);
  }
  console.log(`✅ 도급계약 ${projects.length}개 생성`);

  // ─────────────────────────────────────────
  // 하도급사 10개
  // ─────────────────────────────────────────
  const subcontractorRepo = AppDataSource.getRepository(Subcontractor);
  const subcontractorsData = [
    { name: '대성토건(주)', businessNo: '111-81-55001', workType: '토공', creditRating: 'A', memo: '토목 전문' },
    { name: '한길구조(주)', businessNo: '111-81-55002', workType: '구조', creditRating: 'A+', memo: '교량·터널 구조' },
    { name: '청우포장(주)', businessNo: '111-81-55003', workType: '포장', creditRating: 'B+', memo: '아스팔트 포장' },
    { name: '현대전기설비(주)', businessNo: '111-81-55004', workType: '전기', creditRating: 'A', memo: '도로 전기·조명' },
    { name: '삼성기계(주)', businessNo: '111-81-55005', workType: '기계', creditRating: 'A-', memo: '터널 기계설비' },
    { name: '동아철근(주)', businessNo: '111-81-55006', workType: '철근콘크리트', creditRating: 'B+', memo: '교량 RC 공사' },
    { name: '서울조경(주)', businessNo: '111-81-55007', workType: '조경', creditRating: 'B', memo: '녹지·조경 조성' },
    { name: '한국방수(주)', businessNo: '111-81-55008', workType: '방수', creditRating: 'A', memo: '방수·방진 처리' },
    { name: '우진통신(주)', businessNo: '111-81-55009', workType: '통신', creditRating: 'B+', memo: 'ITS·통신 설비' },
    { name: '미래환경(주)', businessNo: '111-81-55010', workType: '환경', creditRating: 'A-', memo: '환경·오탁수 처리' },
  ];
  const subcontractors: Subcontractor[] = [];
  for (const s of subcontractorsData) {
    let existing = await subcontractorRepo.findOneBy({ businessNo: s.businessNo });
    if (!existing) {
      existing = subcontractorRepo.create(s);
      await subcontractorRepo.save(existing);
    }
    subcontractors.push(existing);
  }
  console.log(`✅ 하도급사 ${subcontractors.length}개 생성`);

  // ─────────────────────────────────────────
  // 하도급계약 20개
  // ─────────────────────────────────────────
  const subcontractRepo = AppDataSource.getRepository(Subcontract);
  const subcontractsData = [
    // P2025-001 경부고속도로 확장 (4개)
    { project: projects[0], subcontractor: subcontractors[0], contractNo: 'SC-001-01', workScope: '토공 및 절성토', contractAmount: 2_800_000_000, currentAmount: 2_800_000_000, contractDate: new Date('2025-02-01') },
    { project: projects[0], subcontractor: subcontractors[1], contractNo: 'SC-001-02', workScope: '교량 구조물 공사', contractAmount: 4_200_000_000, currentAmount: 4_200_000_000, contractDate: new Date('2025-02-15') },
    { project: projects[0], subcontractor: subcontractors[2], contractNo: 'SC-001-03', workScope: '아스팔트 포장공사', contractAmount: 1_500_000_000, currentAmount: 1_500_000_000, contractDate: new Date('2025-04-01') },
    { project: projects[0], subcontractor: subcontractors[3], contractNo: 'SC-001-04', workScope: '도로조명 및 전기설비', contractAmount: 800_000_000, currentAmount: 800_000_000, contractDate: new Date('2025-04-15') },
    // P2025-002 서해안 교량 (3개)
    { project: projects[1], subcontractor: subcontractors[1], contractNo: 'SC-002-01', workScope: '교량 내진보강 구조공사', contractAmount: 2_100_000_000, currentAmount: 2_100_000_000, contractDate: new Date('2025-04-01') },
    { project: projects[1], subcontractor: subcontractors[6], contractNo: 'SC-002-02', workScope: '교량 상판 교체', contractAmount: 1_800_000_000, currentAmount: 1_800_000_000, contractDate: new Date('2025-04-15') },
    { project: projects[1], subcontractor: subcontractors[7], contractNo: 'SC-002-03', workScope: '방수 및 도장공사', contractAmount: 450_000_000, currentAmount: 450_000_000, contractDate: new Date('2025-05-01') },
    // P2024-003 은평 도시재생 (5개)
    { project: projects[2], subcontractor: subcontractors[0], contractNo: 'SC-003-01', workScope: '기초 토공 및 흙막이', contractAmount: 1_200_000_000, currentAmount: 1_200_000_000, contractDate: new Date('2024-08-01') },
    { project: projects[2], subcontractor: subcontractors[5], contractNo: 'SC-003-02', workScope: 'RC 골조 공사', contractAmount: 2_500_000_000, currentAmount: 2_500_000_000, contractDate: new Date('2024-08-15') },
    { project: projects[2], subcontractor: subcontractors[6], contractNo: 'SC-003-03', workScope: '공원 조경 및 녹지 조성', contractAmount: 650_000_000, currentAmount: 650_000_000, contractDate: new Date('2024-10-01') },
    { project: projects[2], subcontractor: subcontractors[3], contractNo: 'SC-003-04', workScope: '가로등 및 전기설비', contractAmount: 320_000_000, currentAmount: 320_000_000, contractDate: new Date('2024-10-01') },
    { project: projects[2], subcontractor: subcontractors[8], contractNo: 'SC-003-05', workScope: 'CCTV 및 통신 인프라', contractAmount: 280_000_000, currentAmount: 280_000_000, contractDate: new Date('2024-11-01') },
    // P2024-004 상수도 관로 완료 (4개)
    { project: projects[3], subcontractor: subcontractors[0], contractNo: 'SC-004-01', workScope: '관로 굴착 및 되메우기', contractAmount: 900_000_000, currentAmount: 900_000_000, contractDate: new Date('2024-05-01'), status: SubcontractStatus.COMPLETED },
    { project: projects[3], subcontractor: subcontractors[9], contractNo: 'SC-004-02', workScope: '환경영향 저감 및 오탁수 처리', contractAmount: 250_000_000, currentAmount: 250_000_000, contractDate: new Date('2024-05-01'), status: SubcontractStatus.COMPLETED },
    { project: projects[3], subcontractor: subcontractors[4], contractNo: 'SC-004-03', workScope: '펌프장 기계설비 공사', contractAmount: 480_000_000, currentAmount: 480_000_000, contractDate: new Date('2024-06-01'), status: SubcontractStatus.COMPLETED },
    { project: projects[3], subcontractor: subcontractors[3], contractNo: 'SC-004-04', workScope: '계측 및 제어설비', contractAmount: 190_000_000, currentAmount: 190_000_000, contractDate: new Date('2024-06-01'), status: SubcontractStatus.COMPLETED },
    // P2026-005 강남 지하차도 (4개)
    { project: projects[4], subcontractor: subcontractors[0], contractNo: 'SC-005-01', workScope: '지하 굴착 및 흙막이 공사', contractAmount: 3_500_000_000, currentAmount: 3_500_000_000, contractDate: new Date('2026-03-01') },
    { project: projects[4], subcontractor: subcontractors[1], contractNo: 'SC-005-02', workScope: '지하차도 구조물 공사', contractAmount: 5_200_000_000, currentAmount: 5_200_000_000, contractDate: new Date('2026-03-15') },
    { project: projects[4], subcontractor: subcontractors[4], contractNo: 'SC-005-03', workScope: '환기 및 기계설비', contractAmount: 1_800_000_000, currentAmount: 1_800_000_000, contractDate: new Date('2026-04-01') },
    { project: projects[4], subcontractor: subcontractors[8], contractNo: 'SC-005-04', workScope: 'ITS 및 도로전광표지', contractAmount: 750_000_000, currentAmount: 750_000_000, contractDate: new Date('2026-04-01') },
  ];
  const subcontracts: Subcontract[] = [];
  for (const s of subcontractsData) {
    let existing = await subcontractRepo.findOneBy({ contractNo: s.contractNo });
    if (!existing) {
      existing = subcontractRepo.create({
        ...s,
        status: (s as any).status ?? SubcontractStatus.ACTIVE,
      });
      await subcontractRepo.save(existing);
    }
    subcontracts.push(existing);
  }
  console.log(`✅ 하도급계약 ${subcontracts.length}개 생성`);

  // ─────────────────────────────────────────
  // 월별 기성 60건 (활성 하도급계약 16개 × 약 3개월 + 완료 4개 × 3개월)
  // 2026-03 ~ 2026-05 기준, 완료 프로젝트는 2025-07 ~ 2025-09
  // ─────────────────────────────────────────
  const billingRepo = AppDataSource.getRepository(MonthlyBilling);

  const activeSubs = subcontracts.filter(s => (s as any).status !== SubcontractStatus.COMPLETED && projects.find(p => p.id === s.projectId)?.status !== ProjectStatus.COMPLETED);
  const completedSubs = subcontracts.filter(s => (s as any).status === SubcontractStatus.COMPLETED || projects.find(p => p.id === s.projectId)?.status === ProjectStatus.COMPLETED);

  // 활성 하도급계약: 2026-03, 2026-04, 2026-05 기성
  const activeMonths = ['2026-03', '2026-04', '2026-05'];
  // 완료 하도급계약: 2025-07, 2025-08, 2025-09 기성
  const completedMonths = ['2025-07', '2025-08', '2025-09'];

  // 각 하도급계약별 월별 실적 (비율로 계획 대비 실제 생성)
  const ratesByMonth: Record<string, [number, number]> = {
    '2026-03': [0.18, 0.16],  // [planned%, actual%]
    '2026-04': [0.22, 0.21],
    '2026-05': [0.20, 0.18],
    '2025-07': [0.25, 0.24],
    '2025-08': [0.28, 0.27],
    '2025-09': [0.22, 0.22],  // 완료 월
  };

  let billingCount = 0;
  const allBillingsToCreate: Array<{ sub: Subcontract; month: string; months: string[] }> = [];

  for (const sub of activeSubs) {
    for (const m of activeMonths) allBillingsToCreate.push({ sub, month: m, months: activeMonths });
  }
  for (const sub of completedSubs) {
    for (const m of completedMonths) allBillingsToCreate.push({ sub, month: m, months: completedMonths });
  }

  for (const { sub, month, months } of allBillingsToCreate) {
    const existing = await billingRepo.findOne({ where: { subcontractId: sub.id, billingMonth: month } });
    if (existing) { billingCount++; continue; }

    const [planRate, actualRate] = ratesByMonth[month];
    const amount = Number(sub.contractAmount);
    const plannedAmount = Math.round(amount * planRate);
    const actualAmount = Math.round(amount * actualRate);

    // cumulative = sum of all previous months' actual
    const prevMonths = months.slice(0, months.indexOf(month));
    let cumulativeAmount = 0;
    for (const pm of prevMonths) {
      const [, prevActualRate] = ratesByMonth[pm];
      cumulativeAmount += Math.round(amount * prevActualRate);
    }
    cumulativeAmount += actualAmount;

    const progressRate = Number(((cumulativeAmount / amount) * 100).toFixed(2));
    const isLastMonth = month === months[months.length - 1];

    const billingData: Partial<MonthlyBilling> = {
      subcontractId: sub.id,
      billingMonth: month,
      plannedAmount,
      actualAmount,
      cumulativeAmount,
      progressRate,
      status: isLastMonth ? BillingStatus.PENDING : BillingStatus.APPROVED,
      isAnomaly: false,
    };
    if (!isLastMonth) {
      billingData.approvedAt = new Date(month + '-25');
      billingData.approvedBy = 'admin@ct.co.kr';
    }
    const billing = billingRepo.create(billingData as MonthlyBilling);
    await billingRepo.save(billing);
    billingCount++;
  }
  console.log(`✅ 월별 기성 ${billingCount}건 생성`);

  // ─────────────────────────────────────────
  // project_metrics 갱신
  // ─────────────────────────────────────────
  const metricRepo = AppDataSource.getRepository(ProjectMetric);
  for (const proj of projects) {
    const subs = subcontracts.filter(s => s.projectId === proj.id);
    let weightedSum = 0;
    let totalAmount = 0;
    let totalApproved = 0;
    let currentMonthBilling = 0;

    for (const sub of subs) {
      const subAmount = Number(sub.currentAmount);
      totalAmount += subAmount;

      const allBillings = await billingRepo.find({ where: { subcontractId: sub.id } });
      const approvedBillings = allBillings.filter(b => b.status === BillingStatus.APPROVED);
      const currentBilling = allBillings.find(b => b.billingMonth === '2026-05');

      const cumulative = approvedBillings.reduce((s, b) => s + Number(b.actualAmount), 0);
      totalApproved += cumulative;
      if (currentBilling) currentMonthBilling += Number(currentBilling.actualAmount);

      if (subAmount > 0) {
        weightedSum += (cumulative / subAmount) * 100 * subAmount;
      }
    }

    const weightedProgress = totalAmount > 0 ? weightedSum / totalAmount : 0;
    const existing = await metricRepo.findOneBy({ projectId: proj.id });
    if (existing) {
      existing.totalSubcontracts = subs.length;
      existing.activeSubcontracts = subs.filter(s => (s as any).status === SubcontractStatus.ACTIVE).length;
      existing.totalSubcontractAmount = totalAmount;
      existing.weightedProgress = Number(weightedProgress.toFixed(2));
      existing.totalApprovedBilling = totalApproved;
      existing.currentMonthBilling = currentMonthBilling;
      existing.delayedCount = 0;
      await metricRepo.save(existing);
    } else {
      await metricRepo.save(metricRepo.create({
        projectId: proj.id,
        totalSubcontracts: subs.length,
        activeSubcontracts: subs.filter(s => (s as any).status === SubcontractStatus.ACTIVE).length,
        totalSubcontractAmount: totalAmount,
        weightedProgress: Number(weightedProgress.toFixed(2)),
        totalApprovedBilling: totalApproved,
        currentMonthBilling,
        delayedCount: 0,
      }));
    }
  }
  console.log(`✅ project_metrics ${projects.length}개 갱신`);

  await AppDataSource.destroy();
  console.log('\n🎉 시드 완료!');
}

seed().catch(e => { console.error(e); process.exit(1); });
