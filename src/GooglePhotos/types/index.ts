import type { ImageStyle, ViewStyle } from 'react-native';

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
  style: ImageStyle;
  source: { uri: string };
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
  | {
      kind: 'header';
      key: string;
      label: string;
      height: number;
      containerStyle: ViewStyle;
    }
  | {
      kind: 'row';
      key: string;
      height: number;
      startIndex: number;
      endIndex: number;
      items: LayoutItem[];
      containerStyle: ViewStyle;
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
