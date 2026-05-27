import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { ComposeOption, ECharts } from "echarts/core";
import type { PolyTrackerActivityResponse } from "../types";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type ChartOption = ComposeOption<
  GridComponentOption | TooltipComponentOption | BarSeriesOption | LineSeriesOption
>;

type ActivityTrendChartProps = {
  activity: PolyTrackerActivityResponse;
  labels: string[];
};

export function ActivityTrendChart({ activity, labels }: ActivityTrendChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    instanceRef.current = chart;

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;

    const daily = activity.series.map((point) => point.dailyCount);
    const cumulative = activity.series.map((point) => point.cumulativeCount);

    const option: ChartOption = {
      backgroundColor: "transparent",
      grid: {
        left: 82,
        right: 86,
        top: 76,
        bottom: 66,
        containLabel: false
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: "#b6ff2e", width: 1 },
          label: {
            show: true,
            backgroundColor: "#050606",
            borderColor: "#b6ff2e",
            borderWidth: 1,
            color: "#f2f2e8",
            fontSize: 16,
            fontWeight: 800
          }
        },
        backgroundColor: "#050606",
        borderColor: "#b6ff2e",
        borderWidth: 1,
        padding: [12, 14],
        textStyle: {
          color: "#f2f2e8",
          fontSize: 16,
          fontFamily: "Source Sans 3, Source Sans Pro, Segoe UI, sans-serif"
        },
        formatter: (params) => {
          const entries = Array.isArray(params) ? params : [params];
          const first = entries[0] as { axisValue?: string };
          const dailyPoint = entries.find((entry) => (entry as { seriesName?: string }).seriesName === "當日發文量") as { value?: number } | undefined;
          const cumulativePoint = entries.find((entry) => (entry as { seriesName?: string }).seriesName === "累積發文量") as { value?: number } | undefined;
          return `
            <div class="chart-tooltip">
              <strong>${first.axisValue ?? ""}</strong>
              <span><i class="tooltip-dot daily"></i>當日發文量 ${dailyPoint?.value ?? 0}</span>
              <span><i class="tooltip-line cumulative"></i>累積發文量 ${formatCompact(cumulativePoint?.value ?? 0)}</span>
            </div>
          `;
        }
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "#242b27" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#778178",
          fontSize: 15,
          fontWeight: 700,
          margin: 16
        },
        splitLine: {
          show: true,
          lineStyle: { color: "#242b27", opacity: 0.72 }
        }
      },
      yAxis: [
        {
          type: "value",
          name: "當日數量",
          min: 0,
          max: 300,
          interval: 75,
          nameTextStyle: {
            color: "#18f6a4",
            fontSize: 16,
            fontWeight: 700,
            align: "left",
            padding: [0, 0, 0, -40]
          },
          axisLabel: {
            color: "#18f6a4",
            fontSize: 16,
            fontWeight: 700
          },
          splitLine: { lineStyle: { color: "#242b27", opacity: 0.72 } }
        },
        {
          type: "value",
          name: "累積數量",
          min: 0,
          max: 12000,
          interval: 3000,
          nameTextStyle: {
            color: "#2d7dff",
            fontSize: 16,
            fontWeight: 700,
            align: "right",
            padding: [0, -30, 0, 0]
          },
          axisLabel: {
            color: "#2d7dff",
            fontSize: 16,
            fontWeight: 700,
            formatter: (value: number) => (value === 0 ? "0" : `${value / 1000}K`)
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "當日發文量",
          type: "bar",
          data: daily,
          barWidth: 22,
          itemStyle: {
            color: "#20d89b",
            borderColor: "#d7ffe8",
            borderWidth: 1,
            borderRadius: [0, 0, 0, 0]
          },
          emphasis: {
            itemStyle: { color: "#18f6a4" }
          }
        },
        {
          name: "累積發文量",
          type: "line",
          yAxisIndex: 1,
          data: cumulative,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: "#2d7dff", width: 3 },
          itemStyle: { color: "#2d7dff" },
          emphasis: {
            scale: 1.45
          }
        }
      ]
    };

    chart.setOption(option, true);
  }, [activity, labels]);

  return (
    <div className="chart-wrap">
      <div ref={chartRef} className="trend-chart" role="img" aria-label="當日發文量與累積發文量趨勢圖" />
      <table className="sr-only">
        <caption>發文量與累積趨勢資料</caption>
        <thead>
          <tr>
            <th>時間</th>
            <th>當日發文量</th>
            <th>累積發文量</th>
          </tr>
        </thead>
        <tbody>
          {activity.series.map((point, index) => (
            <tr key={point.bucketStartAt}>
              <td>{labels[index]}</td>
              <td>{point.dailyCount}</td>
              <td>{point.cumulativeCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${Number((value / 1000).toFixed(1))}K`;
  }
  return String(value);
}
