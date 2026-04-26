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
