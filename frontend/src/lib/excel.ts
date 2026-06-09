import * as XLSX from "xlsx";

/** 공통: 워크북 → .xlsx 파일 다운로드 */
function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

/* ────────────────────────────────────────────
   1. 종합 계약 현황 (리포트)
──────────────────────────────────────────── */
export function exportReports(clientGroups: any[]) {
  const rows: any[][] = [];

  // 헤더
  rows.push([
    "발주처", "계약명", "상태",
    "원계약금액", "현계약금액", "기성누계", "기성률(%)",
    "하도급합계", "하도급비율(%)", "변경횟수",
    "구분",                          // 도급 / 하도급
    "하도급사", "하도급 원계약", "하도급 현계약", "하도급 기성누계", "하도급 기성률(%)",
  ]);

  for (const group of clientGroups) {
    for (const proj of group.projects ?? []) {
      // 도급계약 행
      rows.push([
        group.client.name,
        proj.name,
        statusLabel(proj.status),
        proj.originalAmount,
        proj.currentAmount,
        proj.billingCumulative,
        proj.billingProgress,
        proj.subTotal,
        proj.subRatio,
        proj.changeCount,
        "도급",
        "", "", "", "", "",
      ]);

      // 하도급계약 행
      for (const sub of proj.subcontracts ?? []) {
        rows.push([
          group.client.name,
          proj.name,
          "",
          "",
          "", "", "", "", "", "", "",
          "하도급",
          sub.subcontractorName,
          sub.originalAmount,
          sub.currentAmount,
          sub.billingCumulative,
          sub.billingProgress,
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 열 너비
  ws["!cols"] = [
    { wch: 16 }, { wch: 28 }, { wch: 8 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 9 },
    { wch: 14 }, { wch: 10 }, { wch: 8 },
    { wch: 6 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "종합계약현황");

  const today = new Date().toISOString().slice(0, 10);
  download(wb, `종합계약현황_${today}.xlsx`);
}

/* ────────────────────────────────────────────
   2. 도급 기성현황
──────────────────────────────────────────── */
export function exportProjectBillings(month: string, billingList: any[]) {
  const rows: any[][] = [];

  rows.push([
    "발주처", "도급계약명", "계약금액", "전회금액",
    "당월금액", "누적금액", "기성률(%)", "상태",
  ]);

  for (const b of billingList) {
    const contractAmt = Number(b.project?.currentAmount ?? 0);
    const actualAmt   = Number(b.actualAmount ?? 0);
    const prevCumul   = Number(b.cumulativeAmount ?? 0) - actualAmt;
    const cumul       = Number(b.cumulativeAmount ?? 0);
    const rate        = contractAmt > 0 ? (cumul / contractAmt) * 100 : 0;

    rows.push([
      b.project?.client?.name ?? "",
      b.project?.name ?? "",
      contractAmt,
      prevCumul,
      actualAmt,
      cumul,
      Math.round(rate * 10) / 10,
      billingStatusLabel(b.status),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 16 }, { wch: 28 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `도급기성_${month}`);
  download(wb, `도급기성현황_${month}.xlsx`);
}

/* ────────────────────────────────────────────
   3. 하도급 기성현황
──────────────────────────────────────────── */
export function exportSubBillings(month: string, billingList: any[]) {
  const rows: any[][] = [];

  rows.push([
    "하도급사", "도급계약", "계약금액", "전회금액",
    "당월금액", "누적금액", "기성률(%)", "상태",
  ]);

  for (const b of billingList) {
    const contractAmt = Number(b.subcontract?.currentAmount ?? 0);
    const actualAmt   = Number(b.actualAmount ?? 0);
    const prevCumul   = Number(b.cumulativeAmount ?? 0) - actualAmt;
    const cumul       = Number(b.cumulativeAmount ?? 0);
    const rate        = contractAmt > 0 ? (cumul / contractAmt) * 100 : 0;

    rows.push([
      b.subcontract?.subcontractor?.name ?? "",
      b.subcontract?.project?.name ?? "",
      contractAmt,
      prevCumul,
      actualAmt,
      cumul,
      Math.round(rate * 10) / 10,
      billingStatusLabel(b.status),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 18 }, { wch: 28 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `하도급기성_${month}`);
  download(wb, `하도급기성현황_${month}.xlsx`);
}

/* ────────────────────────────────────────────
   helpers
──────────────────────────────────────────── */
function statusLabel(s: string) {
  return { active: "진행중", completed: "완료", suspended: "일시중단", cancelled: "취소" }[s] ?? s;
}
function billingStatusLabel(s: string) {
  return { pending: "미입력", submitted: "입력완료", approved: "승인완료", rejected: "반려" }[s] ?? s;
}
