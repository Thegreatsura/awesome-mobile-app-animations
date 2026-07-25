import { StyleSheet, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  AnimatedRef,
  SharedValue,
  scrollTo,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSort } from '@fortawesome/free-solid-svg-icons';
import {
  SCROLL_TAB_BOTTOM_INSET,
  SCROLL_TAB_THUMB_HEIGHT,
  SCROLL_TAB_TOP_INSET,
} from '../constants';
import { ZoomLayout } from '../types';
import { clampValue, findRowIndexForOffset } from '../utils';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const ScrollTab = ({
  layouts,
  viewportHeight,
  scrollY,
  currentLevel,
  listRefs,
}: {
  layouts: (ZoomLayout | null)[];
  viewportHeight: number;
  scrollY: SharedValue<number>;
  currentLevel: SharedValue<number>;
  listRefs: AnimatedRef<Animated.ScrollView>[];
}) => {
  const trackHeight = Math.max(
    1,
    viewportHeight -
      SCROLL_TAB_TOP_INSET -
      SCROLL_TAB_BOTTOM_INSET -
      SCROLL_TAB_THUMB_HEIGHT,
  );

  const maxScrollFor = (level: number) => {
    'worklet';
    const layout = layouts[level];
    return layout ? Math.max(0, layout.contentHeight - viewportHeight) : 0;
  };

  const isDragging = useSharedValue(false);
  const thumbOpacity = useSharedValue(0);
  const lastFadeScheduledAt = useSharedValue(-1e9);

  useAnimatedReaction(
    () => scrollY.value,
    (value, previous) => {
      if (previous === null || value === previous) {
        return;
      }
      if (Math.abs(value - lastFadeScheduledAt.value) > 8) {
        lastFadeScheduledAt.value = value;
        thumbOpacity.value = 1;
        thumbOpacity.value = withDelay(1200, withTiming(0, { duration: 400 }));
      }
    },
  );

  const thumbPan = Gesture.Pan()
    .hitSlop({ left: 20, right: 8, top: 10, bottom: 10 })
    .onStart(() => {
      isDragging.value = true;
      thumbOpacity.value = 1;
    })
    .onChange((e) => {
      const maxScroll = maxScrollFor(currentLevel.value);
      const next = clampValue(
        scrollY.value + (e.changeY / trackHeight) * maxScroll,
        0,
        maxScroll,
      );
      scrollTo(listRefs[currentLevel.value], 0, next, false);
    })
    .onEnd(() => {
      isDragging.value = false;
      thumbOpacity.value = withDelay(1200, withTiming(0, { duration: 400 }));
    });

  const thumbStyle = useAnimatedStyle(() => {
    const maxScroll = maxScrollFor(currentLevel.value);
    const ratio = maxScroll > 0 ? scrollY.value / maxScroll : 0;
    return {
      opacity: maxScroll > 0 ? thumbOpacity.value : 0,
      transform: [{ translateY: ratio * trackHeight }],
    };
  });

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDragging.value ? 1 : 0, { duration: 150 }),
  }));

  const bubbleTextProps = useAnimatedProps(() => {
    const layout = layouts[currentLevel.value];
    if (!layout) {
      return { text: '' } as any;
    }
    const rowIndex = findRowIndexForOffset(
      layout.rows,
      scrollY.value + viewportHeight * 0.25,
    );
    return { text: layout.rows[rowIndex]?.label ?? '' } as any;
  });

  return (
    <GestureDetector gesture={thumbPan}>
      <Animated.View style={[styles.thumb, thumbStyle]}>
        <Animated.View style={[styles.bubble, bubbleStyle]}>
          <AnimatedTextInput
            editable={false}
            defaultValue=""
            animatedProps={bubbleTextProps}
            style={styles.bubbleText}
          />
        </Animated.View>
        <FontAwesomeIcon icon={faSort} size={16} color="#5f6368" />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  thumb: {
    position: 'absolute',
    right: 6,
    top: SCROLL_TAB_TOP_INSET,
    width: 36,
    height: SCROLL_TAB_THUMB_HEIGHT,
    borderRadius: SCROLL_TAB_THUMB_HEIGHT / 2,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubble: {
    position: 'absolute',
    right: 48,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 90,
    textAlign: 'center',
  },
});

export default ScrollTab;
