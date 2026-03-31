export type TimeTravelConfig = Readonly<{
    absoluteEpoch?: number;
    absoluteSlot?: number;
    absoluteTimestamp?: number;
}>;

export type ClockState = Readonly<{
    absoluteSlot: number;
    blockHeight: number;
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    transactionCount: number;
}>;

export type SurfnetTimeTravelApi = {
    timeTravel(config: TimeTravelConfig): ClockState;
};
