import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  ScrollView as GHScrollView,
  GestureType,
} from 'react-native-gesture-handler';
import { AnimatedLegendList } from '@legendapp/list/reanimated';
import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { GRID_BOTTOM_PADDING } from '../constants';
import { ListEntry, ZoomLayout } from '../types';

const AnimatedGHScrollView = Animated.createAnimatedComponent(GHScrollView);

type BridgeScrollProps = ScrollViewProps & { ref?: React.Ref<unknown> };

const keyExtractor = (item: ListEntry) => item.key;
const getItemType = (item: ListEntry) => item.kind;
const getFixedItemSize = (item: ListEntry) => item.height;

const RowCell = memo(({ entry }: { entry: ListEntry }) => {
  if (entry.kind !== 'row') {
    return null;
  }
  return (
    <View style={entry.containerStyle}>
      {entry.items.map((item, index) => (
        <Image
          key={index}
          source={item.source}
          recyclingKey={item.id}
          style={item.style}
          contentFit="cover"
          cachePolicy="memory-disk"
          allowDownscaling
        />
      ))}
    </View>
  );
});
RowCell.displayName = 'RowCell';

const HeaderCell = memo(({ entry }: { entry: ListEntry }) => {
  if (entry.kind !== 'header') {
    return null;
  }
  return (
    <View style={entry.containerStyle}>
      <Text style={styles.monthHeader}>{entry.label}</Text>
    </View>
  );
});
HeaderCell.displayName = 'HeaderCell';

const renderItem = ({ item }: LegendListRenderItemProps<ListEntry>) =>
  item.kind === 'header' ? (
    <HeaderCell entry={item} />
  ) : (
    <RowCell entry={item} />
  );

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
  estimatedListSize,
  drawDistance,
  scrollSimultaneousHandlers,
}: {
  layout: ZoomLayout;
  level: number;
  currentLevel: SharedValue<number>;
  targetLevel: SharedValue<number>;
  progress: SharedValue<number>;
  active: boolean;
  scrollEnabled: boolean;
  scrollOffset: SharedValue<number>;
  listScrollRef: React.Ref<Animated.ScrollView>;
  estimatedItemSize: number;
  estimatedListSize: { width: number; height: number };
  drawDistance: number;
  scrollSimultaneousHandlers: React.RefObject<GestureType | undefined>[];
}) => {
  const renderScrollComponent = useCallback(
    ({ ref, ...scrollProps }: BridgeScrollProps) => (
      <AnimatedGHScrollView
        ref={ref as React.Ref<React.ComponentRef<typeof GHScrollView>>}
        simultaneousHandlers={scrollSimultaneousHandlers}
        {...scrollProps}
      />
    ),
    [scrollSimultaneousHandlers],
  );

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
        data={layout.listData}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        getFixedItemSize={getFixedItemSize}
        estimatedItemSize={estimatedItemSize}
        estimatedListSize={estimatedListSize}
        recycleItems
        scrollEnabled={scrollEnabled}
        drawDistance={drawDistance}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderItem={renderItem}
        renderScrollComponent={renderScrollComponent}
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
