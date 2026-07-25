import {
  GRID_BOTTOM_PADDING,
  GRID_GAP,
  MONTH_HEADER_HEIGHT,
} from '../constants';
import {
  LayoutItem,
  LayoutRow,
  MonthHeader,
  Photo,
  ZoomLayout,
} from '../types';

export const computeJustifiedLayout = (
  photos: Photo[],
  screenWidth: number,
  columnCount: number,
): ZoomLayout => {
  const targetRowHeight =
    (screenWidth - GRID_GAP * (columnCount - 1)) / columnCount;

  const items: LayoutItem[] = [];
  const rows: LayoutRow[] = [];
  const headers: MonthHeader[] = [];
  const itemById: Record<string, LayoutItem> = {};

  let y = 0;
  let currentMonth = '';
  let rowBuffer: Photo[] = [];

  const flushRow = (justify: boolean) => {
    if (rowBuffer.length === 0) {
      return;
    }
    const sumAspectRatio = rowBuffer.reduce((s, p) => s + p.aspectRatio, 0);
    const availableWidth = screenWidth - GRID_GAP * (rowBuffer.length - 1);
    const rowHeight = justify
      ? availableWidth / sumAspectRatio
      : Math.min(targetRowHeight, availableWidth / sumAspectRatio);

    let x = 0;
    const startIndex = items.length;
    rowBuffer.forEach((photo) => {
      const item: LayoutItem = {
        id: photo.id,
        uri: photo.uri,
        fullUri: photo.fullUri,
        x,
        y,
        w: rowHeight * photo.aspectRatio,
        h: rowHeight,
      };
      items.push(item);
      itemById[photo.id] = item;
      x += item.w + GRID_GAP;
    });
    rows.push({
      y,
      h: rowHeight,
      startIndex,
      endIndex: items.length - 1,
      label: rowBuffer[0].monthLabel,
    });
    y += rowHeight + GRID_GAP;
    rowBuffer = [];
  };

  photos.forEach((photo) => {
    if (photo.fullMonthLabel !== currentMonth) {
      flushRow(false);
      currentMonth = photo.fullMonthLabel;
      headers.push({ y, label: photo.fullMonthLabel });
      y += MONTH_HEADER_HEIGHT;
    }
    rowBuffer.push(photo);
    const sumAspectRatio = rowBuffer.reduce((s, p) => s + p.aspectRatio, 0);
    const availableWidth = screenWidth - GRID_GAP * (rowBuffer.length - 1);
    if (sumAspectRatio * targetRowHeight >= availableWidth) {
      flushRow(true);
    }
  });
  flushRow(false);

  return {
    columnCount,
    items,
    rows,
    headers,
    contentHeight: y + GRID_BOTTOM_PADDING,
    itemById,
  };
};

export const findRowIndexForOffset = (rows: LayoutRow[], y: number): number => {
  'worklet';
  let lo = 0;
  let hi = rows.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].y <= y) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
};

export const findItemAtPoint = (
  layout: ZoomLayout,
  x: number,
  contentY: number,
): LayoutItem => {
  'worklet';
  const row = layout.rows[findRowIndexForOffset(layout.rows, contentY)];
  for (let i = row.startIndex; i <= row.endIndex; i++) {
    const item = layout.items[i];
    if (x >= item.x && x <= item.x + item.w) {
      return item;
    }
  }
  return layout.items[row.startIndex];
};

export const findFirstItemIndexBelow = (
  items: LayoutItem[],
  y: number,
): number => {
  let lo = 0;
  let hi = items.length - 1;
  let ans = items.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].y + items[mid].h >= y) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
};

export const clampValue = (value: number, lo: number, hi: number): number => {
  'worklet';
  return Math.min(hi, Math.max(lo, value));
};
