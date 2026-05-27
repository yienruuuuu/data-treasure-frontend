import { useEffect, useMemo, useRef, useState } from "react";
import type { RangePreset, SidebarState } from "./types";
import { getActivityTrend, mockActivity } from "./api/polyTrackerClient";
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

export function App() {
  const [sidebar, setSidebar] = useState<SidebarState>("expanded");
  const [selectedRange, setSelectedRange] = useState<RangePreset>("custom");
  const [activity, setActivity] = useState(mockActivity);
  const [now, setNow] = useState(() => new Date());
  const [easternOverride, setEasternOverride] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState("Asia/Taipei");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    getActivityTrend().then(setActivity);
  }, []);

  const easternDisplayDate = easternOverride ?? now;
  const isEasternLive = easternOverride === null;
  const xLabels = useMemo(
    () => activity.series.map((point) => formatEasternAxisLabel(new Date(point.bucketStartAt))),
    [activity.series]
  );

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
              <strong>{activity.source.sourceLabel} / {activity.source.displayName}</strong>
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
                  onClick={() => setSelectedRange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="date-controls">
              <button type="button" className="date-field">5/23 12PM</button>
              <span className="date-arrow">→</span>
              <button type="button" className="date-field compact">5/24 9AM</button>
              <button type="button" className="apply-button">套用</button>
            </div>
          </section>

          <section className="chart-card">
            <div className="chart-card-header">
              <div>
                <h2>發文量與累積趨勢</h2>
                <p>柱狀代表單日發文量，折線代表累積發文量</p>
              </div>
              <div className="legend" aria-hidden="true">
                <span><i className="swatch daily" />當日發文量</span>
                <span><i className="swatch cumulative" />累積發文量</span>
              </div>
            </div>
            <ActivityTrendChart activity={activity} labels={xLabels} />
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
