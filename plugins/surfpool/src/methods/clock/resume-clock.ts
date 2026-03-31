import type { ClockState } from './time-travel';

export type SurfnetResumeClockApi = {
    resumeClock(): ClockState;
};
