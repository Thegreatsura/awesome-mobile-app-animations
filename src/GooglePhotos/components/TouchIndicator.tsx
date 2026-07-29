import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

const DOT_SIZE = 50;
const R = DOT_SIZE / 2;

const TouchDot = ({
  x,
  y,
  active,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
}) => {
  const shown = useDerivedValue(() =>
    withTiming(active.value, { duration: 90 }),
  );
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: x.value - R }, { translateY: y.value - R }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.dot, style]} />;
};

const TouchIndicator = ({
  xs,
  ys,
  active,
}: {
  xs: SharedValue<number>[];
  ys: SharedValue<number>[];
  active: SharedValue<number>[];
}) => (
  <>
    {xs.map((x, i) => (
      <TouchDot key={i} x={x} y={ys[i]} active={active[i]} />
    ))}
  </>
);

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: R,
    backgroundColor: 'rgba(184, 184, 184, 0.9)',
    borderWidth: 3,
    borderColor: '#4a4a4a',
  },
});

export default memo(TouchIndicator);
