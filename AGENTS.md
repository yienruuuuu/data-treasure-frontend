# Agent Handoff Notes

此檔案是給後續 coding agent 快速理解本專案用的工作筆記。當專案架構、重要命令、資料流、設計規格或已知限制有變更時，請同步更新本檔。

## 專案定位

`data-treasure-frontend` 是一個 React 單頁儀表板，用來呈現 X/Tweet 活動洞察，目前聚焦在 Elon Musk 的發文量與累積趨勢。

目前狀態偏向高保真前端 prototype：

- UI 已依照 brutalist / tactical telemetry 規格實作。
- 圖表使用 ECharts。
- 發文趨勢資料已改接 `data-treasure` 後端 `ELON_MUSK` activity-trend endpoint。
- 時間篩選 tab 會觸發查詢；日期欄位與 `套用` button 仍是畫面狀態，尚未接自訂輸入查詢。

## 技術棧

- React 19
- TypeScript
- Vite 6
- ECharts 5
- 純 CSS，未使用 UI framework

常用命令：

```powershell
npm run dev
npm run build
npm run preview
```

`npm run build` 會執行 `tsc -b && vite build`。

## 重要檔案地圖

- `src/main.tsx`
  - React entry point。
  - 掛載 `<App />` 並載入全域 CSS。

- `src/App.tsx`
  - 目前主要 UI 都集中在這裡。
  - 包含 `TopNav`、`Sidebar`、`SidebarSection`、`TimePanel`、toolbar、dashboard header。
  - 管理 sidebar 展開/收合、range tab、現在時間、美東時間 override、自選時區等狀態。

- `src/components/ActivityTrendChart.tsx`
  - ECharts 圖表元件。
  - 使用 bar series 顯示當日發文量，line series 顯示累積發文量。
  - 初始化 ECharts instance，使用 `ResizeObserver` 處理 resize。
  - 保留 hidden table 作為 accessibility summary。

- `src/api/polyTrackerClient.ts`
  - 包含 `mockActivity` 作為保留樣本資料，以及 `getActivityTrend()`。
  - `getActivityTrend()` 會呼叫 `/api/xtracker/persons/tracked/ELON_MUSK/posts/activity-trend`。
  - 未來擴充 API 時優先從這裡擴充，不要把 fetch 邏輯散到 component。

- `src/types.ts`
  - 共用型別。
  - 包含 `SidebarState`、`RangePreset`、`BucketSize`、`PolyTrackerActivityResponse`。

- `src/time.ts`
  - 時區選項與時間格式化工具。
  - 包含 datetime-local 與指定 time zone 之間的轉換邏輯。

- `src/styles.css`
  - 全域樣式與所有 dashboard 視覺 token。
  - 專案目前大部分 layout、responsive、brutalist design 都在這裡。

- `docs/polytracker-brutalist-telemetry-frontend-spec.md`
  - 目前最重要的設計規格來源。
  - 描述 normal、hover、hide sidebar 三種狀態。
  - 若調整視覺，需優先對照此文件與 `docs/assets/*.png`。

- `README.penpot.md`
  - 本地 Penpot stack 與 MCP 連線說明。

## 目前資料流

1. `App` 初始化 `activity` 為 `null`，並以 `activityState` 管理 loading / ready / error。
2. `useEffect` 依 `selectedRange` 呼叫 `getActivityTrend()`。
3. `getActivityTrend()` 透過 Vite proxy 呼叫 `data-treasure` 後端 activity-trend endpoint。
4. `App` 依 activity series 產生美東時間 x 軸 labels。
5. `ActivityTrendChart` 在 activity 成功載入後接收 `activity` 與 `labels`，更新 ECharts option。

## UI 狀態重點

- Sidebar 狀態：
  - `expanded`
  - `collapsed`

- Range presets：
  - `custom`
  - `24h`
  - `7d`
  - `30d`
  - `today`

- 時間面板：
  - 美東時間預設即時更新。
  - 可指定美東時間 override。
  - 自選時區會用同一個 `easternDisplayDate` 顯示不同 time zone。

## 已知限制與改善方向

1. `src/App.tsx` 過於集中
   - 後續功能增加前，建議拆成更小的 components：
     - `TopNav`
     - `Sidebar`
     - `TimePanel`
     - `DashboardHeader`
     - `TimeRangeToolbar`
     - `BottomPanels`

2. 時間篩選尚未完整實作真實行為
   - range tabs 會觸發 activity-trend 查詢。
   - 日期欄位目前是 button，沒有 datetime input 或查詢行為。
   - `套用` button 沒有送出查詢。

3. API 已初步串接
   - Vite dev server proxy `/api` 到 `http://127.0.0.1:8080`。
   - 建議保留 `PolyTrackerActivityResponse` 作為前端 contract。
   - 可考慮加 response validation 或 defensive normalization。

4. 圖表 y-axis 範圍硬編碼
   - daily axis 固定 `0..300`。
   - cumulative axis 固定 `0..12000`。
   - 若接真實資料，應改成依資料動態計算或由 API 提供建議範圍。

5. Bundle 較大
   - 最近一次 `npm run build` 成功。
   - Vite 警告 JS chunk 約 `693 kB` minified，gzip 約 `229 kB`。
   - 主因很可能是 ECharts。
   - 可考慮 lazy load chart 或設定 manual chunks。

## 設計與實作守則

- 優先遵守 `docs/polytracker-brutalist-telemetry-frontend-spec.md`。
- 保持 dashboard 密度，不要改成 landing page 或 marketing layout。
- 保持 hard border、0 radius、暗色 grid、acid green active state。
- 圖表繼續使用 ECharts，不要改成 DOM 手刻圖。
- CSS token 優先使用 `src/styles.css` 內現有 `--bt-*` 變數。
- 若新增互動控制，需補上合理的 accessibility 屬性。
- 若新增或重構重要架構，請同步更新本 `AGENTS.md`。

## 驗證紀錄

最近一次已知檢查：

```powershell
npm run build
```

結果：成功。Vite 有 chunk size warning。

2026-05-28 檢查：

```powershell
npm run build
```

結果：成功。Vite 仍有 ECharts 相關 chunk size warning。Vite dev server 已於 `http://127.0.0.1:5173` 回應 200；透過 proxy 呼叫 activity-trend endpoint 回傳後端 `500 INTERNAL_ERROR`，代表前端 proxy 已轉發但後端資料或服務狀態仍需檢查。

當前工作區曾觀察到未提交變更：

```text
MM src/App.tsx
 M src/styles.css
?? public/
```

後續 agent 不應假設這些變更由自己產生；修改前請先確認相關檔案內容。
