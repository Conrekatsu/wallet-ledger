type MetricsState = {
  transferRequestedTotal: number;
  transferProcessingTotal: number;
  transferCompletedTotal: number;
  transferFailedTotal: number;
  transferRetriedTotal: number;
  transferProcessingDurationMsCount: number;
  transferProcessingDurationMsTotal: number;
};

const state: MetricsState = {
  transferRequestedTotal: 0,
  transferProcessingTotal: 0,
  transferCompletedTotal: 0,
  transferFailedTotal: 0,
  transferRetriedTotal: 0,
  transferProcessingDurationMsCount: 0,
  transferProcessingDurationMsTotal: 0,
};

export function incrementMetric(metric: keyof Omit<MetricsState, 'transferProcessingDurationMsCount' | 'transferProcessingDurationMsTotal'>, by = 1) {
  state[metric] += by;
}

export function observeTransferProcessingDuration(durationMs: number) {
  state.transferProcessingDurationMsCount += 1;
  state.transferProcessingDurationMsTotal += durationMs;
}

export function getMetricsSnapshot() {
  return {
    ...state,
    transferProcessingDurationMsAvg:
      state.transferProcessingDurationMsCount === 0
        ? 0
        : Number((state.transferProcessingDurationMsTotal / state.transferProcessingDurationMsCount).toFixed(2)),
  };
}
