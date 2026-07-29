import { Photo } from '../types';

export const COLUMN_COUNTS = [5, 3, 1];
export const INITIAL_ZOOM_INDEX = 1;

export const GRID_GAP = 2;
export const PLACEHOLDER_COLOR = '#2f2f2f';
export const MONTH_HEADER_HEIGHT = 56;
export const GRID_BOTTOM_PADDING = 120;
export const GRID_TOP_INSET = 80;

export const PINCH_COMMIT_THRESHOLD = 0.35;
export const FULLSCREEN_COMMIT_THRESHOLD = 0.2;
export const FULLSCREEN_DISMISS_THRESHOLD = 1 - FULLSCREEN_COMMIT_THRESHOLD;

export const PINCH_ZOOM_IN_THROW = 1.5;
export const PINCH_ZOOM_OUT_THROW = 0.75;

export const SYNC_SCROLL_DELAY_BY_LEVEL = [500, 350, 250];
export const SYNC_SCROLL_RESCHEDULE_THRESHOLD_BY_LEVEL = [800, 440, 220];

export const SCRUB_SCROLL_THROTTLE_MS_BY_LEVEL = [90, 70, 45];
export const SCRUB_SLOW_SPEED_BY_LEVEL = [30, 40, 55];
export const SCRUB_FAST_SPEED_BY_LEVEL = [110, 130, 170];

export const SCROLL_TAB_THUMB_HEIGHT = 48;
export const SCROLL_TAB_THUMB_WIDTH = 36;
export const SCROLL_TAB_TOP_INSET = 100;
export const SCROLL_TAB_BOTTOM_INSET = 40;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_COUNT = 40;
const START_YEAR = 2026;
const START_MONTH_INDEX = 6;

const MONTHS = Array.from({ length: MONTH_COUNT }, (_, i) => {
  const monthsBack = i;
  const totalMonth = START_YEAR * 12 + START_MONTH_INDEX - monthsBack;
  const year = Math.floor(totalMonth / 12);
  const monthIndex = totalMonth % 12;
  const full = `${MONTH_NAMES[monthIndex]} ${year}`;
  const label = `${MONTH_NAMES[monthIndex].slice(0, 3)} ${year}`;
  return { label, full };
});

const ASPECT_RATIOS = [0.75, 0.8, 1, 1, 1.25, 1.33, 1.5, 1.77];

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const random = mulberry32(20260723);

let photoCounter = 0;
export const PHOTOS: Photo[] = MONTHS.flatMap((month) => {
  const count = 30 + Math.floor(random() * 20);
  return Array.from({ length: count }, () => {
    const id = `photo-${photoCounter++}`;
    const aspectRatio =
      ASPECT_RATIOS[Math.floor(random() * ASPECT_RATIOS.length)];
    return {
      id,
      uri: `https://picsum.photos/seed/${id}/${Math.round(
        240 * aspectRatio,
      )}/240`,
      fullUri: `https://picsum.photos/seed/${id}/${Math.round(
        900 * aspectRatio,
      )}/900`,
      aspectRatio,
      monthLabel: month.label,
      fullMonthLabel: month.full,
    };
  });
});
