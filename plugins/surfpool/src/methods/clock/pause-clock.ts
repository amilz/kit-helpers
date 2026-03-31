import type { ClockState } from './time-travel';

export type SurfnetPauseClockApi = {
    pauseClock(): ClockState;
};
