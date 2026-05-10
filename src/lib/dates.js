export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}
export function fmtKDate(iso) {
    const d = new Date(iso + "T00:00:00");
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
export function shiftDate(iso, deltaDays) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    return d.toISOString().slice(0, 10);
}
// 짧은 마감일 표기: "MM.DD (요일)" — 인라인 메타 영역용.
export function fmtDueShort(iso) {
    const d = new Date(iso + "T00:00:00");
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${iso.slice(5).replace("-", ".")} (${days[d.getDay()]})`;
}
// 이번 주 (토 시작 ~ 금 종료) 범위 — QuestBoard 진행률 기준.
// 주의 시작은 학원 패턴과 별개로 사용자가 일주일을 토~금으로 인식한다는 가정.
export function getWeekSatToFri(todayISO) {
    const [y, m, d] = todayISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay(); // 0=일 ... 6=토
    const offsetToSat = (dow + 1) % 7; // 토면 0, 일이면 1, ..., 금이면 6
    const start = new Date(dt);
    start.setDate(start.getDate() - offsetToSat);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return { start: fmt(start), end: fmt(end) };
}
