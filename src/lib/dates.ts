export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtKDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function shiftDate(iso: string, deltaDays: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// 짧은 마감일 표기: "MM.DD (요일)" — 인라인 메타 영역용.
export function fmtDueShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${iso.slice(5).replace("-", ".")} (${days[d.getDay()]})`;
}
