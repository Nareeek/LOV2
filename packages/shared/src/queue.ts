export const TRAVEL_QUEUE = {
  name: 'travel-events',
  jobs: {
    markArrived: 'mark-arrived',
  },
} as const;

export type MarkArrivedTravelJobData = {
  travelId: string;
};
