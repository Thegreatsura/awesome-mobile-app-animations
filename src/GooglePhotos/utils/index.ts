import {
  GRID_BOTTOM_PADDING,
  GRID_GAP,
  MONTH_HEADER_HEIGHT,
  PLACEHOLDER_COLOR,
} from '../constants';
import {
  LayoutItem,
  LayoutRow,
  ListEntry,
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
  const listData: ListEntry[] = [];
  const itemById: Record<string, LayoutItem> = {};

  let y = 0;
  let currentMonth = '';
  let rowBuffer: Photo[] = [];
  let rowSumAspect = 0;

  const flushRow = (justify: boolean) => {
    if (rowBuffer.length === 0) {
      return;
    }
    const sumAspectRatio = rowSumAspect;
    const availableWidth = screenWidth - GRID_GAP * (rowBuffer.length - 1);
    const rowHeight = justify
      ? availableWidth / sumAspectRatio
      : Math.min(targetRowHeight, availableWidth / sumAspectRatio);

    let x = 0;
    const startIndex = items.length;
    const rowItems: LayoutItem[] = [];
    rowBuffer.forEach((photo) => {
      const w = rowHeight * photo.aspectRatio;
      const item: LayoutItem = {
        id: photo.id,
        uri: photo.uri,
        fullUri: photo.fullUri,
        x,
        y,
        w,
        h: rowHeight,
        style: {
          position: 'absolute',
          left: x,
          top: 0,
          width: w,
          height: rowHeight,
          backgroundColor: PLACEHOLDER_COLOR,
        },
        source: { uri: photo.uri },
      };
      items.push(item);
      rowItems.push(item);
      itemById[photo.id] = item;
      x += item.w + GRID_GAP;
    });
    const endIndex = items.length - 1;
    rows.push({
      y,
      h: rowHeight,
      startIndex,
      endIndex,
      label: rowBuffer[0].monthLabel,
    });
    listData.push({
      kind: 'row',
      key: `r:${items[startIndex].id}`,
      height: rowHeight + GRID_GAP,
      startIndex,
      endIndex,
      items: rowItems,
      containerStyle: { height: rowHeight + GRID_GAP },
    });
    y += rowHeight + GRID_GAP;
    rowBuffer = [];
    rowSumAspect = 0;
  };

  photos.forEach((photo) => {
    if (photo.fullMonthLabel !== currentMonth) {
      flushRow(false);
      currentMonth = photo.fullMonthLabel;
      headers.push({ y, label: photo.fullMonthLabel });
      listData.push({
        kind: 'header',
        key: `h:${photo.fullMonthLabel}`,
        label: photo.fullMonthLabel,
        height: MONTH_HEADER_HEIGHT,
        containerStyle: { height: MONTH_HEADER_HEIGHT },
      });
      y += MONTH_HEADER_HEIGHT;
    }
    rowBuffer.push(photo);
    rowSumAspect += photo.aspectRatio;
    const availableWidth = screenWidth - GRID_GAP * (rowBuffer.length - 1);
    if (rowSumAspect * targetRowHeight >= availableWidth) {
      flushRow(true);
    }
  });
  flushRow(false);

  return {
    columnCount,
    items,
    rows,
    headers,
    listData,
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

export const findHeaderIndexForOffset = (
  headers: MonthHeader[],
  y: number,
): number => {
  'worklet';
  let lo = 0;
  let hi = headers.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (headers[mid].y <= y) {
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
