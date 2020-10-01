import { Triggers } from './types';

export type EventsState = {
  triggers: Triggers;
  currentTrigger: string;
  loading: boolean;
  error: {
    [component: string]: any;
  };
};

const state: EventsState = {
  triggers: {
    scheduled: [],
  },
  currentTrigger: '',
  loading: true,
  error: {},
};

export default state;
