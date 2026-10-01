/**
 * portal.ctgroup.co.kr 전자결재(전자결재 > 기결문서, "자금신청(현장 외주비)") →
 * ct-contract 백엔드(/api/groupware-import/documents)로 동기화하는 1회성 스크립트.
 *
 * Windows 작업 스케줄러로 주기 실행하는 것을 전제로 함 (README 참고).
 *
 * 최초 실행 전 반드시: npm run sync:dry  (--dry-run --headed)
 *  → 실제 화면에서 로그인/목록 스크래핑이 의도대로 되는지 눈으로 확인 후
 *    .env의 GW_*_SELECTOR, SELECTORS 상수를 환경에 맞게 보정할 것.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const DRY_RUN = process.argv.includes('--dry-run');
const HEADED = process.argv.includes('--headed') || process.env.HEADED === 'true';

const CFG = {
  loginUrl: process.env.GW_LOGIN_URL,
  userId: process.env.GW_USER_ID,
  password: process.env.GW_USER_PASSWORD,
  listUrl: process.env.GW_LIST_URL,
  idSelector: process.env.GW_ID_SELECTOR || 'input[name="userId"], input#userId',
  pwSelector: process.env.GW_PW_SELECTOR || 'input[name="password"], input#password',
  submitSelector: process.env.GW_SUBMIT_SELECTOR || 'button[type="submit"], button:has-text("로그인")',
  apiBase: process.env.CT_API_BASE,
  apiKey: process.env.CT_INGEST_API_KEY,
  daysBack: Number(process.env.SYNC_DAYS_BACK || 7),
};

const TARGET_DOC_TYPE = '자금신청(현장 외주비)';
const TARGET_STATUS = '종결'; // 결재 완료(최종 승인)된 문서만

/** 지출내역 표의 컬럼 순서 — 실제 화면과 다르면 여기만 수정 */
const EXPENSE_COLUMNS = [
  'no', 'purpose', 'description', 'vendorName', 'evidence', 'siteName',
  'transactionDate', 'paymentRequestDate', 'supplyAmount', 'vat', 'totalAmount',
  'bank', 'accountNo', 'accountHolder', 'department', 'employee',
];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'sync.log'), line + '\n');
}

function toAmount(text) {
  const n = Number(String(text || '').replace(/[,원]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function toIsoDate(text) {
  const m = String(text || '').trim().match(/(\d{4})[.\-](\d{2})[.\-](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

function buildExternalKey(doc) {
  if (doc.approvalNo && doc.approvalNo !== '-') return `APPROVAL:${doc.approvalNo}`;
  const raw = `${doc.title}|${doc.draftDate}|${doc.totalAmount}`;
  return `HASH:${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)}`;
}

async function login(page) {
  log(`로그인 시도: ${CFG.loginUrl}`);
  await page.goto(CFG.loginUrl, { waitUntil: 'domcontentloaded' });
  // 이미 로그인된 세션(쿠키 재사용 등)일 수 있으므로, 로그인 폼이 보일 때만 입력
  const idInput = page.locator(CFG.idSelector).first();
  if (await idInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await idInput.fill(CFG.userId);
    await page.locator(CFG.pwSelector).first().fill(CFG.password);
    await page.locator(CFG.submitSelector).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    log('로그인 폼 제출 완료');
  } else {
    log('로그인 폼이 보이지 않음 — 이미 로그인된 세션이거나 셀렉터 보정 필요');
  }
}

/** 라벨 텍스트 바로 다음에 오는 값 엘리먼트 텍스트를 가져옴 (라벨/값 그리드 공통 패턴) */
async function labelValue(scope, label) {
  const loc = scope.locator(
    `xpath=//*[normalize-space(text())="${label}"]/following::*[1]`,
  ).first();
  return (await loc.textContent().catch(() => null))?.trim();
}

/**
 * 결재일 범위를 "최근 N일"로 좁힘. 화면에서 두 개의 날짜 텍스트박스(시작/종료)로
 * 확인됐으나 달력 위젯 클릭이 필요할 수 있어 best-effort로 시도만 하고,
 * 실패해도 기본 범위로 계속 진행(서버가 externalKey로 중복을 걸러주므로 안전).
 */
async function setDateRangeRecent(page) {
  const from = new Date(Date.now() - CFG.daysBack * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  try {
    const dateInputs = page.locator('input[type="text"]');
    const n = await dateInputs.count();
    if (n >= 2) {
      await dateInputs.nth(0).fill(from);
      await dateInputs.nth(1).fill(to);
      await page.keyboard.press('Enter').catch(() => {});
      log(`날짜 범위 설정: ${from} ~ ${to}`);
    } else {
      log('날짜 범위 입력칸을 찾지 못함 — 기본 범위로 진행');
    }
  } catch (e) {
    log(`날짜 범위 설정 실패(기본 범위로 진행): ${e.message}`);
  }
}

async function scrapeMatchingDocuments(page) {
  await page.goto(CFG.listUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await setDateRangeRecent(page);

  // 문서종류 태그 텍스트를 앵커로 각 리스트 행을 찾음
  const rowAnchors = page.locator(`text=${TARGET_DOC_TYPE}`);
  const count = await rowAnchors.count();
  log(`"${TARGET_DOC_TYPE}" 태그 ${count}건 발견 (상태 필터링 전)`);

  const docs = [];
  for (let i = 0; i < count; i += 1) {
    const anchor = rowAnchors.nth(i);
    // 태그의 조상 중 클릭 가능한 행 컨테이너를 찾음 (li/tr/div 어느 쪽이든 공통 조상 사용)
    const row = anchor.locator('xpath=ancestor::*[self::li or self::tr or self::div][1]');
    const rowText = (await row.textContent().catch(() => '')) || '';
    if (!rowText.includes(TARGET_STATUS)) continue; // 진행중/반려 문서는 제외

    await row.click({ timeout: 5000 }).catch((e) => log(`행 클릭 실패(건너뜀): ${e.message}`));
    await page.waitForTimeout(800);

    const detail = page.locator('body');
    // 상세 패널에서 문서종류 태그 바로 다음 줄이 문서 제목 (화면 확인된 패턴)
    const title = await detail
      .locator(`xpath=//*[normalize-space(text())="${TARGET_DOC_TYPE}"]/following::*[1]`)
      .first().textContent().catch(() => null);

    const approvalNo = await labelValue(detail, '품의번호');
    const draftDateRaw = await labelValue(detail, '기안일');
    const totalAmountRaw = await labelValue(detail, '총합계');

    const doc = {
      title: (title || '').trim() || `문서-${i}`,
      docType: TARGET_DOC_TYPE,
      approvalNo,
      draftDate: toIsoDate(draftDateRaw),
      approvedAt: toIsoDate(draftDateRaw),
      totalAmount: toAmount(totalAmountRaw),
      lines: [],
    };

    // "지출내역" 표를 앵커로 찾아 그 아래 tr들을 파싱
    const expenseTable = page.locator('xpath=//*[normalize-space(text())="지출내역"]/following::table[1]');
    const rows = expenseTable.locator('tr');
    const rowCount = await rows.count().catch(() => 0);
    for (let r = 0; r < rowCount; r += 1) {
      const cells = await rows.nth(r).locator('td').allTextContents();
      if (cells.length < EXPENSE_COLUMNS.length) continue; // 헤더 행 등 스킵
      const line = {};
      EXPENSE_COLUMNS.forEach((key, idx) => { line[key] = cells[idx]?.trim(); });
      doc.lines.push({
        purpose: line.purpose,
        description: line.description,
        vendorName: line.vendorName,
        siteName: line.siteName,
        transactionDate: toIsoDate(line.transactionDate),
        paymentRequestDate: toIsoDate(line.paymentRequestDate),
        supplyAmount: toAmount(line.supplyAmount),
        vat: toAmount(line.vat),
        totalAmount: toAmount(line.totalAmount),
      });
    }

    doc.externalKey = buildExternalKey(doc);
    if (doc.lines.length > 0) {
      docs.push(doc);
      log(`스크래핑: ${doc.title} (줄 ${doc.lines.length}개, externalKey=${doc.externalKey})`);
    } else {
      log(`경고: "${doc.title}" 지출내역 테이블을 못 찾음 — 셀렉터 보정 필요`);
    }
  }

  return docs;
}

async function postToCtContract(documents) {
  const res = await fetch(`${CFG.apiBase}/groupware-import/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': CFG.apiKey },
    body: JSON.stringify({ documents }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ct-contract 응답 오류 ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  for (const [k, v] of Object.entries({ 'GW_LOGIN_URL': CFG.loginUrl, 'GW_USER_ID': CFG.userId, 'GW_LIST_URL': CFG.listUrl, 'CT_API_BASE': CFG.apiBase, 'CT_INGEST_API_KEY': CFG.apiKey })) {
    if (!v) throw new Error(`.env 설정 누락: ${k}`);
  }

  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage();

  try {
    await login(page);
    const documents = await scrapeMatchingDocuments(page);
    log(`총 ${documents.length}건 스크래핑 완료`);

    if (DRY_RUN) {
      const outPath = path.join(__dirname, 'scraped-output.json');
      fs.writeFileSync(outPath, JSON.stringify(documents, null, 2), 'utf-8');
      log(`DRY RUN: 실제 전송 생략, 결과 저장 → ${outPath}`);
    } else if (documents.length > 0) {
      const result = await postToCtContract(documents);
      log(`전송 완료: ${JSON.stringify(result)}`);
    } else {
      log('전송할 신규 문서 없음');
    }
  } catch (e) {
    log(`오류: ${e.stack || e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
