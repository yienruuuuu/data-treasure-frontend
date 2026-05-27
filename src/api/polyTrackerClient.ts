import type { PolyTrackerActivityResponse } from "../types";

export const mockActivity: PolyTrackerActivityResponse = {
  source: {
    platform: "X",
    sourceLabel: "Tweet",
    personId: "elon-musk",
    handle: "elonmusk",
    displayName: "Elon Musk"
  },
  range: {
    startAt: "2026-05-23T16:00:00Z",
    endAt: "2026-05-24T13:00:00Z",
    timezone: "UTC",
    bucket: "hour"
  },
  metrics: {
    totalCount: 609,
    peakBucketStartAt: "2026-05-24T04:00:00Z",
    peakBucketCount: 225,
    cumulativeEndCount: 9600
  },
  series: [
    { bucketStartAt: "2026-05-23T16:00:00Z", bucketEndAt: "2026-05-23T19:00:00Z", dailyCount: 35, cumulativeCount: 700 },
    { bucketStartAt: "2026-05-23T19:00:00Z", bucketEndAt: "2026-05-23T22:00:00Z", dailyCount: 62, cumulativeCount: 2000 },
    { bucketStartAt: "2026-05-23T22:00:00Z", bucketEndAt: "2026-05-24T01:00:00Z", dailyCount: 24, cumulativeCount: 3500 },
    { bucketStartAt: "2026-05-24T01:00:00Z", bucketEndAt: "2026-05-24T04:00:00Z", dailyCount: 20, cumulativeCount: 4600 },
    { bucketStartAt: "2026-05-24T04:00:00Z", bucketEndAt: "2026-05-24T07:00:00Z", dailyCount: 225, cumulativeCount: 6600 },
    { bucketStartAt: "2026-05-24T07:00:00Z", bucketEndAt: "2026-05-24T10:00:00Z", dailyCount: 65, cumulativeCount: 7800 },
    { bucketStartAt: "2026-05-24T10:00:00Z", bucketEndAt: "2026-05-24T13:00:00Z", dailyCount: 28, cumulativeCount: 9000 },
    { bucketStartAt: "2026-05-24T13:00:00Z", bucketEndAt: "2026-05-24T16:00:00Z", dailyCount: 150, cumulativeCount: 9600 }
  ],
  insight: {
    title: "趨勢摘要",
    body: "5/24 12AM 出現發文高峰，累積曲線在凌晨後維持穩定上升。"
  }
};

export async function getActivityTrend(): Promise<PolyTrackerActivityResponse> {
  return mockActivity;
}
