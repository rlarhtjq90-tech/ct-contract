/**
 * 숫자 포맷 유틸리티 — 1,000원 단위 쉼표 적용
 */

/** 금액: 쉼표 + 원 (예: 2,800,000,000원) */
export function fmtMoney(v: number | string | undefined | null): string {
  const n = Number(v ?? 0);
  if (isNaN(n)) return "0원";
  return n.toLocaleString("ko-KR") + "원";
}

/** 금액 (원 단위 제외): 쉼표만 (예: 2,800,000,000) */
export function fmtNum(v: number | string | undefined | null): string {
  const n = Number(v ?? 0);
  if (isNaN(n)) return "0";
  return n.toLocaleString("ko-KR");
}

/** 차트 축 전용 — 공간이 좁으므로 억 단위 유지, 但 쉼표 적용 */
export function fmtMoneyAxis(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 100_000_000) {
    const eok = v / 100_000_000;
    return eok % 1 === 0
      ? `${eok.toLocaleString("ko-KR")}억`
      : `${eok.toFixed(0)}억`;
  }
  if (Math.abs(v) >= 10_000) return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`;
  return v.toLocaleString("ko-KR");
}

/** 진행률: 소수점 1자리 % (예: 37.8%) */
export function fmtRate(v: number | string | undefined | null): string {
  const n = Number(v ?? 0);
  return `${n.toFixed(1)}%`;
}
