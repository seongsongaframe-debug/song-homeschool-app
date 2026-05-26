import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DataProvider, useData } from "./store/DataContext";
import { AuthProvider, useAuth } from "./store/AuthContext";
import { maybeAutoSeedAll, runDailyCleaningSync } from "./lib/auto-quests";
import QuestBoard from "./pages/QuestBoard";
import ParentQuests from "./pages/ParentQuests";
import Curriculum from "./pages/Curriculum";
import Reading from "./pages/Reading";
import Projects from "./pages/Projects";
import Report from "./pages/Report";
import Shop from "./pages/Shop";
import Manage from "./pages/Manage";
import Achievements from "./pages/Achievements";
import MonsterDex from "./pages/MonsterDex";
import { ThemeToggle } from "./components/ThemeToggle";
import { PinPad } from "./components/PinPad";
import { PointBurst } from "./components/PointBurst";

const CHILD_NAV = [
  { to: "/today", label: "오늘", icon: "🎯" },
  { to: "/dex", label: "도감", icon: "📓" },
  { to: "/achievements", label: "성취", icon: "🏆" },
  { to: "/shop", label: "상점", icon: "🏪" },
  { to: "/reading", label: "독서", icon: "📚" },
  { to: "/projects", label: "프로젝트", icon: "🔬" },
];

const PARENT_NAV = [
  { to: "/today", label: "과제 배포", icon: "📝" },
  { to: "/curriculum", label: "커리큘럼", icon: "🗂️" },
  { to: "/manage", label: "관리", icon: "🔧" },
  { to: "/report", label: "일일요약", icon: "📋" },
  { to: "/reading", label: "독서", icon: "📚" },
  { to: "/projects", label: "프로젝트", icon: "🔬" },
];

function Shell() {
  const { ready: dataReady, error: dataError, reload } = useData();
  const { ready: authReady, role, pinSet, enterParent, exitParent } = useAuth();
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (!dataReady || dataError) return;
    maybeAutoSeedAll().catch((e) => console.warn("[auto-seed]", e));
    runDailyCleaningSync().catch((e) => console.warn("[cleaning-sync]", e));
  }, [dataReady, dataError]);

  if (!dataReady || !authReady) {
    return (
      <div className="h-full flex items-center justify-center text-stone-500 dark:text-stone-400">
        준비 중…
      </div>
    );
  }

  // 데이터 로드가 실패한 경우 — 조용히 "준비 중…" 으로 멈추지 않도록 명확히 노출.
  if (dataError) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-5 text-stone-800
                        dark:border-red-900 dark:bg-stone-900 dark:text-stone-100">
          <div className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">⚠ 데이터 로드 실패</div>
          <div className="text-sm mb-3 whitespace-pre-wrap break-words">{dataError}</div>
          <div className="text-xs text-stone-600 dark:text-stone-400 mb-3">
            확인 경로: Firebase 콘솔 → Firestore Database → 규칙 탭. 리포 루트의
            <code className="mx-1 px-1 bg-stone-200 dark:bg-stone-800 rounded">firestore.rules</code>
            내용을 붙여넣고 게시하세요.
          </div>
          <button
            onClick={() => reload()}
            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
          >
            🔄 다시 시도
          </button>
        </div>
      </div>
    );
  }

  const NAV = role === "parent" ? PARENT_NAV : CHILD_NAV;

  async function handleRoleSwitch() {
    if (role === "parent") {
      await exitParent();
      return;
    }
    if (!pinSet) {
      const ok = await enterParent("0000");
      if (ok) return;
      setShowPin(true);
    } else {
      setShowPin(true);
    }
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      <aside className="hidden md:flex md:flex-col md:w-56 bg-white border-r border-stone-200 p-4
                        dark:bg-stone-900 dark:border-stone-800">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-lg text-brand-600 dark:text-brand-500">송홈스쿨</div>
          <span
            className="chip"
            style={
              role === "parent"
                ? { backgroundColor: "#fef3c7", color: "#92400e" }
                : { backgroundColor: "#dbeafe", color: "#1e40af" }
            }
          >
            {role === "parent" ? "🔧 보호자" : "👧 아이"}
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg flex items-center gap-2 ${
                  isActive
                    ? "bg-brand-50 text-brand-700 font-semibold dark:bg-stone-800 dark:text-brand-400"
                    : "hover:bg-stone-100 dark:hover:bg-stone-800"
                }`
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-1">
          <button
            onClick={handleRoleSwitch}
            className="w-full text-sm px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700"
          >
            {role === "parent" ? "🚪 아이 모드로" : "🔐 보호자 모드"}
          </button>
          <ThemeToggle />
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3
                         bg-white/80 dark:bg-stone-900/80 backdrop-blur
                         border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-brand-600 dark:text-brand-500">송홈스쿨</span>
          <span
            className="chip"
            style={
              role === "parent"
                ? { backgroundColor: "#fef3c7", color: "#92400e" }
                : { backgroundColor: "#dbeafe", color: "#1e40af" }
            }
          >
            {role === "parent" ? "보호자" : "아이"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRoleSwitch}
            className="text-xs px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800"
          >
            {role === "parent" ? "🚪" : "🔐"}
          </button>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route
            path="/today"
            element={role === "parent" ? <ParentQuests /> : <QuestBoard />}
          />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/dex" element={<MonsterDex />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="/curriculum" element={<Curriculum />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 grid z-40
                   dark:bg-stone-900 dark:border-stone-800"
        style={{ gridTemplateColumns: `repeat(${NAV.length}, 1fr)` }}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-[11px] ${
                isActive
                  ? "text-brand-600 font-semibold dark:text-brand-400"
                  : "text-stone-500 dark:text-stone-400"
              }`
            }
          >
            <span className="text-xl">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {showPin && (
        <PinPad
          title="보호자 모드"
          subtitle={pinSet ? "PIN 4자리 입력" : "아직 PIN이 없습니다 (관리에서 설정)"}
          onSubmit={async (pin) => {
            const ok = await enterParent(pin);
            if (ok) setShowPin(false);
            return ok;
          }}
          onCancel={() => setShowPin(false)}
        />
      )}

      <PointBurst />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </DataProvider>
  );
}
