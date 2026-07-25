export interface Photo {
  id: string;
  uri: string;
  fullUri: string;
  aspectRatio: number;
  monthLabel: string;
  fullMonthLabel: string;
}

export interface LayoutItem {
  id: string;
  uri: string;
  fullUri: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutRow {
  y: number;
  h: number;
  startIndex: number;
  endIndex: number;
  label: string;
}

export interface MonthHeader {
  y: number;
  label: string;
}

export type ListEntry =
  | { kind: 'header'; key: string; label: string; height: number }
  | {
      kind: 'row';
      key: string;
      height: number;
      startIndex: number;
      endIndex: number;
    };

export interface ZoomLayout {
  columnCount: number;
  items: LayoutItem[];
  rows: LayoutRow[];
  headers: MonthHeader[];
  listData: ListEntry[];
  contentHeight: number;
  itemById: Record<string, LayoutItem>;
}
