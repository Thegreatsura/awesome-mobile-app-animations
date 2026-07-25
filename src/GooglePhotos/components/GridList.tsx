import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { AnimatedLegendList } from '@legendapp/list/reanimated';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { GRID_BOTTOM_PADDING } from '../constants';
import { LayoutItem, ListEntry, ZoomLayout } from '../types';

const PLACEHOLDER_COLOR = '#2f2f2f';

const EMPTY_LIST_DATA: ListEntry[] = [];
const EMPTY_ITEMS: LayoutItem[] = [];

const RowCell = memo(
  ({ entry, items }: { entry: ListEntry; items: LayoutItem[] }) => {
    if (entry.kind !== 'row') {
      return null;
    }
    const rowItems: LayoutItem[] = [];
    for (let i = entry.startIndex; i <= entry.endIndex; i++) {
      rowItems.push(items[i]);
    }
    return (
      <View style={{ height: entry.height }}>
        {rowItems.map((item) => (
          <Image
            key={item.id}
            source={{ uri: item.uri }}
            recyclingKey={item.id}
            style={{
              position: 'absolute',
              left: item.x,
              top: 0,
              width: item.w,
              height: item.h,
              backgroundColor: PLACEHOLDER_COLOR,
            }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </View>
    );
  },
);
RowCell.displayName = 'RowCell';

const HeaderCell = memo(({ entry }: { entry: ListEntry }) => {
  if (entry.kind !== 'header') {
    return null;
  }
  return (
    <View style={{ height: entry.height }}>
      <Text style={styles.monthHeader}>{entry.label}</Text>
    </View>
  );
});
HeaderCell.displayName = 'HeaderCell';

const GridList = ({
  layout,
  level,
  currentLevel,
  targetLevel,
  progress,
  active,
  scrollEnabled,
  scrollOffset,
  listScrollRef,
  estimatedItemSize,
  drawDistance,
}: {
  layout: ZoomLayout | null;
  level: number;
  currentLevel: SharedValue<number>;
  targetLevel: SharedValue<number>;
  progress: SharedValue<number>;
  active: boolean;
  scrollEnabled: boolean;
  scrollOffset: SharedValue<number>;
  listScrollRef: React.Ref<Animated.ScrollView>;
  estimatedItemSize: number;
  drawDistance: number;
}) => {
  const wrapperStyle = useAnimatedStyle(() => {
    let opacity = 0;
    let scale = 1;
    const zoomingIn = targetLevel.value > currentLevel.value;
    if (level === currentLevel.value) {
      opacity = 1 - progress.value;
      scale = zoomingIn ? 1 + 0.06 * progress.value : 1 - 0.04 * progress.value;
    } else if (level === targetLevel.value) {
      opacity = progress.value;
      scale = zoomingIn
        ? interpolate(progress.value, [0, 1], [0.94, 1])
        : interpolate(progress.value, [0, 1], [1.04, 1]);
    }
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, wrapperStyle]}
      pointerEvents={active ? 'auto' : 'none'}
    >
      <AnimatedLegendList
        refScrollView={listScrollRef}
        sharedValues={{ scrollOffset }}
        data={layout?.listData ?? EMPTY_LIST_DATA}
        extraData={layout}
        keyExtractor={(item: ListEntry) => item.key}
        getItemType={(item: ListEntry) => item.kind}
        getFixedItemSize={(item: ListEntry) => item.height}
        estimatedItemSize={estimatedItemSize}
        recycleItems
        scrollEnabled={scrollEnabled}
        drawDistance={drawDistance}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderItem={({ item }: LegendListRenderItemProps<ListEntry>) =>
          item.kind === 'header' ? (
            <HeaderCell entry={item} />
          ) : (
            <RowCell entry={item} items={layout?.items ?? EMPTY_ITEMS} />
          )
        }
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: GRID_BOTTOM_PADDING,
  },
  monthHeader: {
    left: 4,
    paddingTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default memo(GridList);
