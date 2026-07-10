export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** false for the still-forming most recent bar. */
  confirmed: boolean;
}

export interface PivotTouch {
  ts: number;
  price: number;
  kind: 'high' | 'low';
}

export interface Level {
  price: number;
  touches: number;
  strong: boolean;
  firstTouchTs: number;
  lastTouchTs: number;
  /** now - firstTouchTs, in days. */
  ageDays: number;
  /** now - lastTouchTs, in days. */
  recencyDays: number;
  /** lastTouchTs - firstTouchTs, in days. */
  spanDays: number;
  score: number;
  role: 'support' | 'resistance';
  /** Unsigned % distance from current price (0.02 = 2%). */
  distancePct: number;
}

export interface BreakoutEvent {
  level: Level;
  direction: 'up' | 'down';
  brokenAtTs: number;
  ageAtBreakDays: number;
}

export type StoryKind = 'breakout' | 'testing' | 'fallback';

export interface LevelStory {
  kind: StoryKind;
  text: string;
  level?: Level;
  breakout?: BreakoutEvent;
  nearestDirection?: 'above' | 'below';
}

export interface DetectionResult {
  currentPrice: number;
  asOfTs: number;
  /** All levels clearing minTouches, sorted by price ascending. */
  allLevels: Level[];
  /** Subset within the relevance window, sorted by rank score (score * closeness) descending. */
  relevantLevels: Level[];
  breakout: BreakoutEvent | null;
  story: LevelStory;
}
