import { Photo } from '../types';

export const COLUMN_COUNTS = [5, 3, 1];
export const INITIAL_ZOOM_INDEX = 1;

export const GRID_GAP = 2;
export const MONTH_HEADER_HEIGHT = 56;
export const GRID_BOTTOM_PADDING = 120;

export const PINCH_COMMIT_THRESHOLD = 0.35;
export const FULLSCREEN_COMMIT_THRESHOLD = 0.3;

export const SCROLL_TAB_THUMB_HEIGHT = 48;
export const SCROLL_TAB_TOP_INSET = 100;
export const SCROLL_TAB_BOTTOM_INSET = 40;

const MONTHS = [
  { label: 'Jul 2026', full: 'July 2026' },
  { label: 'Jun 2026', full: 'June 2026' },
  { label: 'May 2026', full: 'May 2026' },
  { label: 'Apr 2026', full: 'April 2026' },
  { label: 'Mar 2026', full: 'March 2026' },
  { label: 'Feb 2026', full: 'February 2026' },
  { label: 'Jan 2026', full: 'January 2026' },
  { label: 'Dec 2025', full: 'December 2025' },
  { label: 'Nov 2025', full: 'November 2025' },
  { label: 'Oct 2025', full: 'October 2025' },
];

const ASPECT_RATIOS = [0.75, 0.8, 1, 1, 1.25, 1.33, 1.5, 1.77];

const PHOTO_TAGS = [
  'portrait',
  'selfie',
  'friends',
  'family',
  'baby',
  'dog',
  'puppy',
  'cat',
  'kitten',
  'food',
  'breakfast',
  'coffee',
  'dessert',
  'pizza',
  'beach',
  'sunset',
  'mountains',
  'hiking',
  'travel',
  'cityscape',
  'wedding',
  'party',
  'birthday',
  'flowers',
  'garden',
  'roadtrip',
  'architecture',
  'street',
  'autumn',
  'snow',
];

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
  const count = 8 + Math.floor(random() * 10);
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
