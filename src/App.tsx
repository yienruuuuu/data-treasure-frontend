import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "react-day-picker/locale";
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

type RangeEndpoint = "startAt" | "endAt";
const MAX_ACTIVITY_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

function rangeWindowForPreset(range: Exclude<RangePreset, "custom">, now = new Date()) {
  const endAt = new Date(now);
  const startAt = new Date(endAt);

  if (range === "24h") {
    startAt.setHours(startAt.getHours() - 24);
    return { startAt, endAt, bucket: "hour" as const };
  }

  if (range === "7d") {
    return easternNoonTaskWindow(endAt, 7);
  }

  if (range === "30d") {
    return easternNoonTaskWindow(endAt, 30);
  }

  const easternDate = formatDateTimeLocalValueInTimeZone(endAt, "America/New_York").slice(0, 10);
  const easternStart = parseDateTimeLocalInTimeZone(`${easternDate}T00:00:00`, "America/New_York");
  return { startAt: easternStart, endAt, bucket: "hour" as const };
}

function easternNoonTaskWindow(now: Date, days: number) {
  const easternNow = formatDateTimeLocalValueInTimeZone(now, "America/New_York");
  const { year, month, day, hour } = dateTimeParts(easternNow);
  const anchorDate = new Date(Date.UTC(year, month - 1, day));

  if (hour < 12) {
    anchorDate.setUTCDate(anchorDate.getUTCDate() - 1);
  }

  const easternAnchorDate = `${pad4(anchorDate.getUTCFullYear())}-${pad2(anchorDate.getUTCMonth() + 1)}-${pad2(anchorDate.getUTCDate())}`;
  const easternEndAt = parseDateTimeLocalInTimeZone(`${easternAnchorDate}T12:00:00`, "America/New_York");
  const easternStartDate = new Date(easternEndAt);
  easternStartDate.setUTCDate(easternStartDate.getUTCDate() - days);

  return { startAt: easternStartDate, endAt: easternEndAt, bucket: "day" as const };
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

  validateActivityRange(startAt, endAt);

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
  validateActivityRange(window.startAt, window.endAt);
  return { startAt: window.startAt.toISOString(), endAt: window.endAt.toISOString(), bucket: window.bucket };
}

function validateActivityRange(startAt: Date, endAt: Date) {
  const durationMs = endAt.getTime() - startAt.getTime();

  if (durationMs <= 0) {
    throw new Error("查詢起始時間必須早於結束時間");
  }

  if (durationMs > MAX_ACTIVITY_RANGE_MS) {
    throw new Error("查詢區間不可超過 31 天，請縮短起訖時間");
  }
}

function dateTimeParts(value: string) {
  const [date = "", time = "00:00:00"] = value.split("T");
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = time.split(":").map(Number);

  return { year, month, day, hour, minute, second };
}

function dateForPicker(value: string) {
  const { year, month, day } = dateTimeParts(value);
  return new Date(year, month - 1, day);
}

function setDatePart(value: string, date: Date) {
  const { hour, minute, second } = dateTimeParts(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

function setTimePart(value: string, part: TimePart, nextValue: string) {
  const parsedValue = Number(nextValue);
  const max = part === "hour" ? 23 : 59;
  const normalizedValue = Number.isFinite(parsedValue) ? Math.min(max, Math.max(0, parsedValue)) : 0;
  const parts = dateTimeParts(value);

  return `${pad4(parts.year)}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(part === "hour" ? normalizedValue : parts.hour)}:${pad2(part === "minute" ? normalizedValue : parts.minute)}:${pad2(part === "second" ? normalizedValue : parts.second)}`;
}

function stepTimePart(value: string, part: TimePart, direction: 1 | -1) {
  const parts = dateTimeParts(value);
  const max = part === "hour" ? 23 : 59;
  const currentValue = parts[part];
  const nextValue = (currentValue + direction + max + 1) % (max + 1);

  return setTimePart(value, part, String(nextValue));
}

function formatDateTimeControlValue(value: string) {
  const { year, month, day, hour, minute, second } = dateTimeParts(value);
  return `${pad4(year)}/${pad2(month)}/${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)} ET`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function pad4(value: number) {
  return String(value).padStart(4, "0");
}

type TimePart = "hour" | "minute" | "second";

export function App() {
  const [sidebar, setSidebar] = useState<SidebarState>("expanded");
  const [selectedRange, setSelectedRange] = useState<RangePreset>("custom");
  const [customRange, setCustomRange] = useState(defaultCustomWindow);
  const [appliedCustomRange, setAppliedCustomRange] = useState(defaultCustomWindow);
  const [openRangePicker, setOpenRangePicker] = useState<RangeEndpoint | null>(null);
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

    let request: ReturnType<typeof activityTrendRequestForRange>;
    try {
      request = activityTrendRequestForRange(selectedRange, appliedCustomRange.startAt, appliedCustomRange.endAt);
    } catch (error: unknown) {
      setActivityState("error");
      setActivityError(error instanceof Error ? error.message : "查詢條件錯誤");
      return () => {
        isActive = false;
      };
    }

    getActivityTrend(request)
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
                      setOpenRangePicker(null);
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
              <DateTimeField
                label="自訂區間開始時間（美東）"
                value={customRange.startAt}
                isOpen={openRangePicker === "startAt"}
                onToggle={() => {
                  setSelectedRange("custom");
                  setOpenRangePicker((current) => current === "startAt" ? null : "startAt");
                }}
                onClose={() => setOpenRangePicker(null)}
                onChange={(value) => {
                  setSelectedRange("custom");
                  setCustomRange((current) => ({ ...current, startAt: value }));
                }}
              />
              <span className="date-arrow">→</span>
              <DateTimeField
                label="自訂區間結束時間（美東）"
                value={customRange.endAt}
                isOpen={openRangePicker === "endAt"}
                compact
                onToggle={() => {
                  setSelectedRange("custom");
                  setOpenRangePicker((current) => current === "endAt" ? null : "endAt");
                }}
                onClose={() => setOpenRangePicker(null)}
                onChange={(value) => {
                  setSelectedRange("custom");
                  setCustomRange((current) => ({ ...current, endAt: value }));
                }}
              />
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
              {activityState === "error" ? `查詢條件錯誤：${activityError}` : null}
            </div>
            {activity ? <ActivityTrendChart activity={activity} labels={xLabels} /> : null}
          </section>
        </main>
      </div>
    </div>
  );
}

type DateTimeFieldProps = {
  label: string;
  value: string;
  isOpen: boolean;
  compact?: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
};

function DateTimeField({ label, value, isOpen, compact = false, onToggle, onClose, onChange }: DateTimeFieldProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const parts = dateTimeParts(value);
  const [timeDraft, setTimeDraft] = useState(() => ({
    hour: pad2(parts.hour),
    minute: pad2(parts.minute),
    second: pad2(parts.second)
  }));

  useEffect(() => {
    const nextParts = dateTimeParts(value);
    setTimeDraft({
      hour: pad2(nextParts.hour),
      minute: pad2(nextParts.minute),
      second: pad2(nextParts.second)
    });
  }, [value]);

  const commitTimeDraft = (part: TimePart) => {
    const nextValue = timeDraft[part] === "" ? "0" : timeDraft[part];
    onChange(setTimePart(value, part, nextValue));
  };

  const updateTimeDraft = (part: TimePart, nextValue: string) => {
    setTimeDraft((current) => ({ ...current, [part]: nextValue.replace(/\D/g, "").slice(0, 2) }));
  };

  const stepTimeDraft = (part: TimePart, direction: 1 | -1) => {
    const committedValue = setTimePart(value, part, timeDraft[part] === "" ? "0" : timeDraft[part]);
    onChange(stepTimePart(committedValue, part, direction));
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (pickerRef.current?.contains(event.target as Node)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="date-picker-field" ref={pickerRef}>
      <button
        type="button"
        className={compact ? "date-field compact" : "date-field"}
        aria-expanded={isOpen}
        aria-label={label}
        onClick={onToggle}
      >
        <span>{formatDateTimeControlValue(value)}</span>
      </button>
      {isOpen ? (
        <div className="date-picker-popover">
          <DayPicker
            mode="single"
            selected={dateForPicker(value)}
            onSelect={(date) => {
              if (date) {
                onChange(setDatePart(value, date));
              }
            }}
            locale={zhTW}
            weekStartsOn={1}
          />
          <div className="date-time-controls" aria-label={`${label}時間`}>
            <TimeStepper
              label="HH"
              value={timeDraft.hour}
              onChange={(nextValue) => updateTimeDraft("hour", nextValue)}
              onCommit={() => commitTimeDraft("hour")}
              onStep={(direction) => stepTimeDraft("hour", direction)}
            />
            <TimeStepper
              label="MM"
              value={timeDraft.minute}
              onChange={(nextValue) => updateTimeDraft("minute", nextValue)}
              onCommit={() => commitTimeDraft("minute")}
              onStep={(direction) => stepTimeDraft("minute", direction)}
            />
            <TimeStepper
              label="SS"
              value={timeDraft.second}
              onChange={(nextValue) => updateTimeDraft("second", nextValue)}
              onCommit={() => commitTimeDraft("second")}
              onStep={(direction) => stepTimeDraft("second", direction)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

type TimeStepperProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onStep: (direction: 1 | -1) => void;
};

function TimeStepper({ label, value, onChange, onCommit, onStep }: TimeStepperProps) {
  return (
    <label className="time-stepper">
      <span>{label}</span>
      <div className="time-stepper-control">
        <input
          inputMode="numeric"
          maxLength={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onStep(1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onStep(-1);
            }
          }}
        />
        <div className="time-stepper-buttons" aria-hidden="false">
          <button type="button" aria-label={`${label} 加一`} onMouseDown={(event) => event.preventDefault()} onClick={() => onStep(1)}><span>⌃</span></button>
          <button type="button" aria-label={`${label} 減一`} onMouseDown={(event) => event.preventDefault()} onClick={() => onStep(-1)}><span>⌄</span></button>
        </div>
      </div>
    </label>
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
