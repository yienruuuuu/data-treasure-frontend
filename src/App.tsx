import { useEffect, useMemo, useRef, useState } from "react";
import type { PolyTrackerActivityResponse, RangePreset, SidebarState } from "./types";
import { getActivityTrend } from "./api/polyTrackerClient";
import {
  formatDateTime,
  formatDateTimeLocalValueInTimeZone,
  formatEasternAxisLabel,
  parseDateTimeLocalInTimeZone,
  timezoneOptions
} from "./time";
import { ActivityTrendChart } from "./components/ActivityTrendChart";

const rangeTabs: Array<{ id: RangePreset; label: string }> = [
  { id: "custom", label: "自訂區間" },
  { id: "24h", label: "過去24h" },
  { id: "7d", label: "過去7d" },
  { id: "30d", label: "過去30d" },
  { id: "today", label: "今天" }
];

function rangeWindowForPreset(range: Exclude<RangePreset, "custom">, now = new Date()) {
  const endAt = new Date(now);
  const startAt = new Date(endAt);

  if (range === "24h") {
    startAt.setHours(startAt.getHours() - 24);
    return { startAt, endAt, bucket: "hour" as const };
  }

  if (range === "7d") {
    startAt.setDate(startAt.getDate() - 7);
    return { startAt, endAt, bucket: "day" as const };
  }

  if (range === "30d") {
    startAt.setDate(startAt.getDate() - 30);
    return { startAt, endAt, bucket: "day" as const };
  }

  const easternDate = formatDateTimeLocalValueInTimeZone(endAt, "America/New_York").slice(0, 10);
  const easternStart = parseDateTimeLocalInTimeZone(`${easternDate}T00:00:00`, "America/New_York");
  return { startAt: easternStart, endAt, bucket: "hour" as const };
}

function defaultCustomWindow() {
  const endAt = new Date();
  const startAt = new Date(endAt);
  startAt.setHours(startAt.getHours() - 24);

  return {
    startAt: formatDateTimeLocalValueInTimeZone(startAt, "America/New_York"),
    endAt: formatDateTimeLocalValueInTimeZone(endAt, "America/New_York")
  };
}

function activityTrendRequestForCustomRange(startAtValue: string, endAtValue: string) {
  const startAt = parseDateTimeLocalInTimeZone(startAtValue, "America/New_York");
  const endAt = parseDateTimeLocalInTimeZone(endAtValue, "America/New_York");

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    bucket: "hour" as const
  };
}

function formatRangeInputValueForPreset(range: Exclude<RangePreset, "custom">) {
  const window = rangeWindowForPreset(range);

  return {
    startAt: formatDateTimeLocalValueInTimeZone(window.startAt, "America/New_York"),
    endAt: formatDateTimeLocalValueInTimeZone(window.endAt, "America/New_York")
  };
}

function activityTrendRequestForRange(range: RangePreset, customStartAt: string, customEndAt: string) {
  if (range === "custom") {
    return activityTrendRequestForCustomRange(customStartAt, customEndAt);
  }

  const window = rangeWindowForPreset(range);
  return { startAt: window.startAt.toISOString(), endAt: window.endAt.toISOString(), bucket: window.bucket };
}

export function App() {
  const [sidebar, setSidebar] = useState<SidebarState>("expanded");
  const [selectedRange, setSelectedRange] = useState<RangePreset>("custom");
  const [customRange, setCustomRange] = useState(defaultCustomWindow);
  const [appliedCustomRange, setAppliedCustomRange] = useState(defaultCustomWindow);
  const [activity, setActivity] = useState<PolyTrackerActivityResponse | null>(null);
  const [activityState, setActivityState] = useState<"loading" | "ready" | "error">("loading");
  const [activityError, setActivityError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [easternOverride, setEasternOverride] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState("Asia/Taipei");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;
    setActivityState("loading");
    setActivityError(null);

    getActivityTrend(activityTrendRequestForRange(selectedRange, appliedCustomRange.startAt, appliedCustomRange.endAt))
      .then((response) => {
        if (!isActive) {
          return;
        }
        setActivity(response);
        setActivityState("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }
        setActivityState("error");
        setActivityError(error instanceof Error ? error.message : "Activity trend request failed");
      });

    return () => {
      isActive = false;
    };
  }, [selectedRange, appliedCustomRange]);

  const easternDisplayDate = easternOverride ?? now;
  const isEasternLive = easternOverride === null;
  const xLabels = useMemo(
    () => activity?.series.map((point) => formatEasternAxisLabel(new Date(point.bucketStartAt))) ?? [],
    [activity]
  );
  const volumeLabel = activity?.range.bucket === "day" ? "每日發文量" : "每小時發文量";

  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-body" data-sidebar={sidebar}>
        <Sidebar
          state={sidebar}
          onToggle={() => setSidebar((current) => (current === "expanded" ? "collapsed" : "expanded"))}
          easternDisplayDate={easternDisplayDate}
          isEasternLive={isEasternLive}
          onSetEasternOverride={setEasternOverride}
          onReturnNow={() => setEasternOverride(null)}
          timezone={timezone}
          onTimezoneChange={setTimezone}
        />
        <main className="dashboard-content">
          <section className="dashboard-header">
            <div>
              <h1>X 活動洞察</h1>
              <p>追蹤 Elon Musk 在指定時間區間內的發文量與累積趨勢。</p>
            </div>
            <div className="source-chip" aria-label="目前資料源">
              <span>目前資料源</span>
              <strong>{activity ? `${activity.source.sourceLabel} / ${activity.source.displayName}` : "Tweet / ELON_MUSK"}</strong>
            </div>
          </section>

          <section className="toolbar" aria-label="時間篩選">
            <div className="range-tabs">
              {rangeTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={tab.id === selectedRange ? "is-active" : ""}
                  type="button"
                  aria-pressed={tab.id === selectedRange}
                  onClick={() => {
                    setSelectedRange(tab.id);
                    if (tab.id !== "custom") {
                      setCustomRange(formatRangeInputValueForPreset(tab.id));
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <form
              className="date-controls"
              onSubmit={(event) => {
                event.preventDefault();
                setSelectedRange("custom");
                setAppliedCustomRange(customRange);
              }}
            >
              <label className="date-field">
                <span className="sr-only">自訂區間開始時間（美東）</span>
                <input
                  type="datetime-local"
                  step="1"
                  value={customRange.startAt}
                  onChange={(event) => {
                    setSelectedRange("custom");
                    setCustomRange((current) => ({ ...current, startAt: event.target.value }));
                  }}
                />
              </label>
              <span className="date-arrow">→</span>
              <label className="date-field compact">
                <span className="sr-only">自訂區間結束時間（美東）</span>
                <input
                  type="datetime-local"
                  step="1"
                  value={customRange.endAt}
                  onChange={(event) => {
                    setSelectedRange("custom");
                    setCustomRange((current) => ({ ...current, endAt: event.target.value }));
                  }}
                />
              </label>
              <button type="submit" className="apply-button">套用</button>
            </form>
          </section>

          <section className="chart-card">
            <div className="chart-card-header">
              <div>
                <h2>發文量與累積趨勢</h2>
                <p>柱狀代表{volumeLabel}，折線代表累積發文量</p>
              </div>
              <div className="legend" aria-hidden="true">
                <span><i className="swatch daily" />{volumeLabel}</span>
                <span><i className="swatch cumulative" />累積發文量</span>
              </div>
            </div>
            <div className={`data-state ${activityState}`} role={activityState === "error" ? "alert" : "status"}>
              {activityState === "loading" ? "正在同步後端資料源 / ELON_MUSK" : null}
              {activityState === "ready" ? "後端資料源已連線 / ELON_MUSK" : null}
              {activityState === "error" ? `後端資料源連線失敗：${activityError}` : null}
            </div>
            {activity ? <ActivityTrendChart activity={activity} labels={xLabels} /> : null}
          </section>
        </main>
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="top-nav">
      <div className="brand">POLY RAVEN</div>
      <nav aria-label="主導覽">
        <button type="button" className="top-nav-item is-active">資料</button>
      </nav>
      <button className="status-chip" type="button" aria-label="使用者狀態">
        <span />
      </button>
    </header>
  );
}

type SidebarProps = {
  state: SidebarState;
  onToggle: () => void;
  easternDisplayDate: Date;
  isEasternLive: boolean;
  onSetEasternOverride: (date: Date) => void;
  onReturnNow: () => void;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
};

function Sidebar({
  state,
  onToggle,
  easternDisplayDate,
  isEasternLive,
  onSetEasternOverride,
  onReturnNow,
  timezone,
  onTimezoneChange
}: SidebarProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(() =>
    formatDateTimeLocalValueInTimeZone(new Date(), "America/New_York")
  );

  if (state === "collapsed") {
    return (
      <aside className="sidebar collapsed" aria-label="側邊欄">
        <button className="sidebar-expand" type="button" onClick={onToggle} aria-expanded={false}>
          ›
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="側邊欄">
      <div className="sidebar-scroll">
        <div className="sidebar-controls">
          <button className="sidebar-collapse" type="button" onClick={onToggle} aria-expanded={true}>‹</button>
        </div>

        <SidebarSection
          title="#Tweet 人物資料源"
          items={[{ label: "Elon Musk", active: true }]}
        />
      </div>

      <TimePanel
        easternDisplayDate={easternDisplayDate}
        isEasternLive={isEasternLive}
        isPickerOpen={isPickerOpen}
        draftTime={draftTime}
        timezone={timezone}
        onOpenPicker={() => {
          setDraftTime(formatDateTimeLocalValueInTimeZone(easternDisplayDate, "America/New_York"));
          setIsPickerOpen((open) => !open);
        }}
        onDraftTimeChange={setDraftTime}
        onApplyDraft={() => {
          onSetEasternOverride(parseDateTimeLocalInTimeZone(draftTime, "America/New_York"));
          setIsPickerOpen(false);
        }}
        onReturnNow={() => {
          onReturnNow();
          setIsPickerOpen(false);
        }}
        onTimezoneChange={onTimezoneChange}
      />
    </aside>
  );
}

function SidebarSection({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; subtitle?: string; active?: boolean }>;
}) {
  return (
    <section className="sidebar-section">
      <h2>{title}</h2>
      <div className="sidebar-items">
        {items.map((item) => (
          <button key={item.label} className={item.active ? "nav-item active" : "nav-item"} type="button">
            <span>{item.label}</span>
            {item.subtitle ? <small>{item.subtitle}</small> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

type TimePanelProps = {
  easternDisplayDate: Date;
  isEasternLive: boolean;
  isPickerOpen: boolean;
  draftTime: string;
  timezone: string;
  onOpenPicker: () => void;
  onDraftTimeChange: (value: string) => void;
  onApplyDraft: () => void;
  onReturnNow: () => void;
  onTimezoneChange: (value: string) => void;
};

function TimePanel({
  easternDisplayDate,
  isEasternLive,
  isPickerOpen,
  draftTime,
  timezone,
  onOpenPicker,
  onDraftTimeChange,
  onApplyDraft,
  onReturnNow,
  onTimezoneChange
}: TimePanelProps) {
  const easternTimeInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="time-panel" aria-label="時間設定">
      <article className="time-card eastern-time">
        <div className="time-card-row">
          <h2>美東時間</h2>
          <span className={isEasternLive ? "live-state" : "live-state paused"}>
            <i />{isEasternLive ? "即時更新" : "已指定"}
          </span>
        </div>
        <strong className="time-value">{formatDateTime(easternDisplayDate, "America/New_York")}</strong>
        <div className="time-actions">
          <button type="button" className="secondary-time-button" onClick={onOpenPicker}>指定時間</button>
          <button type="button" className="now-button" onClick={onReturnNow}>NOW</button>
        </div>
        {isPickerOpen ? (
          <div className="time-picker">
            <label>
              <span>指定美東時間</span>
              <div className="time-input-wrap">
                <input
                  ref={easternTimeInputRef}
                  type="datetime-local"
                  step="1"
                  value={draftTime}
                  onChange={(event) => onDraftTimeChange(event.target.value)}
                />
                <button
                  type="button"
                  className="time-picker-icon"
                  aria-label="開啟日期時間選擇器"
                  onClick={() => {
                    easternTimeInputRef.current?.showPicker();
                    easternTimeInputRef.current?.focus();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 4h14v16H5z" />
                    <path d="M8 2v4M16 2v4M5 8h14" />
                    <path d="M8 11h3v3H8zM13 11h3v3h-3zM8 16h3v2H8zM13 16h3v2h-3z" />
                  </svg>
                </button>
              </div>
            </label>
            <button type="button" onClick={onApplyDraft}>套用</button>
          </div>
        ) : null}
      </article>

      <article className="time-card custom-zone">
        <h2>自選時區</h2>
        <label className="timezone-select">
          <span className="sr-only">選擇時區</span>
          <select value={timezone} onChange={(event) => onTimezoneChange(event.target.value)}>
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <strong className="time-value">{formatDateTime(easternDisplayDate, timezone)}</strong>
      </article>
    </div>
  );
}
