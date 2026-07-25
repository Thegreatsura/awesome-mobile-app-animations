import { memo, useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, {
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { ZoomLayout } from '../types';
import { findFirstItemIndexBelow } from '../utils';

const WINDOW_CHUNK = 400;

const PLACEHOLDER_COLOR = '#2f2f2f';

const GridLayer = ({
  layout,
  level,
  viewportHeight,
  contentHeights,
  scrollY,
  currentLevel,
  targetLevel,
  progress,
  pinchActive,
  targetOffset,
}: {
  layout: ZoomLayout;
  level: number;
  viewportHeight: number;
  contentHeights: number[];
  scrollY: SharedValue<number>;
  currentLevel: SharedValue<number>;
  targetLevel: SharedValue<number>;
  progress: SharedValue<number>;
  pinchActive: SharedValue<boolean>;
  targetOffset: SharedValue<number>;
}) => {
  const offset = useDerivedValue(() => {
    if (level === currentLevel.value) {
      return scrollY.value;
    }
    if (pinchActive.value && level === targetLevel.value) {
      return targetOffset.value;
    }
    const currentMax = Math.max(
      1,
      contentHeights[currentLevel.value] - viewportHeight,
    );
    const myMax = Math.max(0, layout.contentHeight - viewportHeight);
    return (scrollY.value / currentMax) * myMax;
  });

  const wrapperStyle = useAnimatedStyle(() => {
    let opacity = 0;
    let scale = 1;
    const zoomingIn = targetLevel.value > currentLevel.value;
    if (level === currentLevel.value) {
      opacity = 1 - progress.value;
      scale = zoomingIn
        ? 1 + 0.06 * progress.value
        : 1 - 0.04 * progress.value;
    } else if (pinchActive.value && level === targetLevel.value) {
      opacity = progress.value;
      scale = zoomingIn
        ? interpolate(progress.value, [0, 1], [0.94, 1])
        : interpolate(progress.value, [0, 1], [1.04, 1]);
    }
    return { opacity, transform: [{ scale }] };
  });

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -offset.value }],
  }));

  const [range, setRange] = useState({ start: 0, end: 0 });
  const updateWindow = useCallback(
    (top: number) => {
      const start = findFirstItemIndexBelow(
        layout.items,
        top - viewportHeight,
      );
      const limit = top + viewportHeight * 2;
      let end = start;
      while (end < layout.items.length && layout.items[end].y < limit) {
        end++;
      }
      setRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    },
    [layout, viewportHeight],
  );
  useEffect(() => {
    updateWindow(0);
  }, [updateWindow]);
  useAnimatedReaction(
    () => Math.round(offset.value / WINDOW_CHUNK),
    (chunk, previousChunk) => {
      if (chunk !== previousChunk) {
        runOnJS(updateWindow)(chunk * WINDOW_CHUNK);
      }
    },
    [updateWindow],
  );

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.wrapper, wrapperStyle]}
      pointerEvents="none"
    >
      <Animated.View style={canvasStyle}>
        {layout.headers.map((header) => (
          <Text
            key={header.label}
            style={[styles.monthHeader, { top: header.y }]}
          >
            {header.label}
          </Text>
        ))}
        {layout.items.slice(range.start, range.end).map((item) => (
          <Image
            key={item.id}
            source={{ uri: item.uri }}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              width: item.w,
              height: item.h,
              backgroundColor: PLACEHOLDER_COLOR,
            }}
            resizeMode="cover"
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  monthHeader: {
    position: 'absolute',
    left: 4,
    paddingTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default memo(GridLayer);
