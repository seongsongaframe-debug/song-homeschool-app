// 아이 화면(QuestBoard) 상단에서 "어제 vs 오늘 획득 포인트"를 강조해
// 성취욕을 자극하는 카드. 둘 다 0 이고 승인 대기도 없으면 자체 숨김.

interface RecentPointsCardProps {
  todayPoints: number;
  yesterdayPoints: number;
  awaitingPoints: number;
}

export function RecentPointsCard({
  todayPoints,
  yesterdayPoints,
  awaitingPoints,
}: RecentPointsCardProps) {
  if (todayPoints === 0 && yesterdayPoints === 0 && awaitingPoints === 0) {
    return null;
  }

  const max = Math.max(todayPoints, yesterdayPoints, 1);
  const todayPct = (todayPoints / max) * 100;
  const yesterdayPct = (yesterdayPoints / max) * 100;

  const diff = todayPoints - yesterdayPoints;
  const message = buildMessage(todayPoints, yesterdayPoints);

  return (
    <section className="card mb-4 bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-amber-950/40 border-amber-200 dark:border-amber-800">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-amber-800 dark:text-amber-300">
          ✨ 최근 점수
        </h2>
        {awaitingPoints > 0 && (
          <span
            className="chip"
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
            title="보호자 확인 후 지급될 점수"
          >
            ⏳ 곧 들어올 +{awaitingPoints}p
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DayColumn
          label="어제"
          points={yesterdayPoints}
          pct={yesterdayPct}
          highlight={false}
        />
        <DayColumn
          label="오늘"
          points={todayPoints}
          pct={todayPct}
          highlight={true}
          diff={diff}
        />
      </div>

      <div className="mt-3 text-sm text-center font-semibold text-amber-900 dark:text-amber-200">
        {message}
      </div>
    </section>
  );
}

function DayColumn({
  label,
  points,
  pct,
  highlight,
  diff,
}: {
  label: string;
  points: number;
  pct: number;
  highlight: boolean;
  diff?: number;
}) {
  return (
    <div>
      <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`font-extrabold ${
            highlight
              ? "text-4xl text-brand-600 dark:text-brand-400"
              : "text-2xl text-stone-700 dark:text-stone-300"
          }`}
        >
          +{points}
        </span>
        <span
          className={
            highlight
              ? "text-base font-bold text-brand-600 dark:text-brand-400"
              : "text-sm text-stone-500 dark:text-stone-400"
          }
        >
          p
        </span>
        {highlight && typeof diff === "number" && diff > 0 && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1">
            ▲{diff}
          </span>
        )}
        {highlight && typeof diff === "number" && diff < 0 && points > 0 && (
          <span className="text-xs font-medium text-stone-400 dark:text-stone-500 ml-1">
            ▼{Math.abs(diff)}
          </span>
        )}
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
        <div
          className={`h-full transition-all ${
            highlight
              ? "bg-gradient-to-r from-brand-400 to-brand-600"
              : "bg-stone-400 dark:bg-stone-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function buildMessage(today: number, yesterday: number): string {
  if (today === 0 && yesterday === 0) {
    return "✨ 첫 퀘스트를 끝내고 점수를 시작해보자!";
  }
  if (today === 0 && yesterday > 0) {
    return `💪 어제 +${yesterday}p! 오늘도 한 개부터 시작!`;
  }
  if (today > yesterday) {
    const diff = today - yesterday;
    return yesterday === 0
      ? `🚀 오늘 +${today}p! 좋은 출발!`
      : `🚀 어제보다 +${diff}p 더! 잘했어!`;
  }
  if (today === yesterday) {
    return `🔥 어제와 같은 페이스, 꾸준함이 최고!`;
  }
  // today < yesterday && today > 0
  return `💪 어제 페이스(${yesterday}p)까지 조금만 더!`;
}
