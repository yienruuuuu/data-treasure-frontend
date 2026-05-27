export type SidebarState = "expanded" | "collapsed";
export type RangePreset = "custom" | "24h" | "7d" | "30d" | "today";
export type BucketSize = "hour" | "day";

export type PolyTrackerActivityResponse = {
  source: {
    platform: "X";
    sourceLabel: "Tweet";
    personId: string;
    handle: string;
    displayName: string;
  };
  range: {
    startAt: string;
    endAt: string;
    timezone: "UTC";
    bucket: BucketSize;
  };
  metrics: {
    totalCount: number;
    peakBucketStartAt: string | null;
    peakBucketCount: number;
    cumulativeEndCount: number;
  };
  series: Array<{
    bucketStartAt: string;
    bucketEndAt: string;
    dailyCount: number;
    cumulativeCount: number;
  }>;
  insight: {
    title: string;
    body: string;
  };
};
