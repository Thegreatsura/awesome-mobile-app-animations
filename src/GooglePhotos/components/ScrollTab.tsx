import { memo } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  AnimatedRef,
  SharedValue,
  cancelAnimation,
  scrollTo,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSort } from '@fortawesome/free-solid-svg-icons/faSort';
import {
  SCROLL_TAB_BOTTOM_INSET,
  SCROLL_TAB_THUMB_HEIGHT,
  SCROLL_TAB_THUMB_WIDTH,
  SCROLL_TAB_TOP_INSET,
} from '../constants';
import { ZoomLayout } from '../types';
import { clampValue, findRowIndexForOffset } from '../utils';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const SCRUB_SCROLL_THROTTLE_MS = 60;
const SCRUB_SLOW_SPEED = 50;
const SCRUB_FAST_SPEED = 150;

const ScrollTab = ({
  layouts,
  viewportHeight,
  scrollY,
  currentLevel,
  listRefs,
  pinchActive,
}: {
  layouts: (ZoomLayout | null)[];
  viewportHeight: number;
  scrollY: SharedValue<number>;
  currentLevel: SharedValue<number>;
  listRefs: AnimatedRef<Animated.ScrollView>[];
  pinchActive: SharedValue<boolean>;
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
  const dragOffset = useSharedValue(0);
  const scrollCooldown = useSharedValue(0);
  const thumbOpacity = useSharedValue(0);
  const thumbTranslateX = useSharedValue(SCROLL_TAB_THUMB_WIDTH);
  const lastFadeScheduledAt = useSharedValue(-1e9);

  const showThumb = () => {
    'worklet';
    thumbOpacity.value = withTiming(1, { duration: 150 });
    thumbTranslateX.value = withTiming(0, { duration: 150 });
  };

  const scheduleHideThumb = () => {
    'worklet';
    thumbOpacity.value = withDelay(1200, withTiming(0, { duration: 400 }));
    thumbTranslateX.value = withDelay(
      1200,
      withTiming(SCROLL_TAB_THUMB_WIDTH, { duration: 400 }),
    );
  };

  const showThumbAndScheduleHide = () => {
    'worklet';
    thumbOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(1200, withTiming(0, { duration: 400 })),
    );
    thumbTranslateX.value = withSequence(
      withTiming(0, { duration: 150 }),
      withDelay(1200, withTiming(SCROLL_TAB_THUMB_WIDTH, { duration: 400 })),
    );
  };

  const hideThumb = () => {
    'worklet';
    thumbOpacity.value = withTiming(0, { duration: 200 });
    thumbTranslateX.value = withTiming(SCROLL_TAB_THUMB_WIDTH, {
      duration: 200,
    });
  };

  useAnimatedReaction(
    () => scrollY.value,
    (value, previous) => {
      if (previous === null || value === previous) {
        return;
      }
      if (pinchActive.value || isDragging.value) {
        return;
      }
      if (Math.abs(value - lastFadeScheduledAt.value) > 24) {
        lastFadeScheduledAt.value = value;
        showThumbAndScheduleHide();
      }
    },
  );

  useAnimatedReaction(
    () => pinchActive.value,
    (active, previous) => {
      if (active && !previous) {
        hideThumb();
      }
    },
  );

  const thumbPan = Gesture.Pan()
    .hitSlop({ left: 20, right: 8, top: 10, bottom: 10 })
    .onStart(() => {
      isDragging.value = true;
      dragOffset.value = scrollY.value;
      showThumb();
    })
    .onChange((e) => {
      const maxScroll = maxScrollFor(currentLevel.value);
      const next = clampValue(
        dragOffset.value + (e.changeY / trackHeight) * maxScroll,
        0,
        maxScroll,
      );
      dragOffset.value = next;
      if (scrollCooldown.value === 0) {
        scrollTo(listRefs[currentLevel.value], 0, next, false);
        const speed = Math.abs(e.velocityY);
        const interval =
          speed <= SCRUB_SLOW_SPEED
            ? 0
            : clampValue(
                ((speed - SCRUB_SLOW_SPEED) /
                  (SCRUB_FAST_SPEED - SCRUB_SLOW_SPEED)) *
                  SCRUB_SCROLL_THROTTLE_MS,
                0,
                SCRUB_SCROLL_THROTTLE_MS,
              );
        if (interval > 0) {
          scrollCooldown.value = 1;
          scrollCooldown.value = withTiming(0, { duration: interval });
        }
      }
    })
    .onEnd(() => {
      cancelAnimation(scrollCooldown);
      scrollCooldown.value = 0;
      scrollTo(listRefs[currentLevel.value], 0, dragOffset.value, false);
      isDragging.value = false;
      scheduleHideThumb();
    });

  const thumbStyle = useAnimatedStyle(() => {
    const maxScroll = maxScrollFor(currentLevel.value);
    const offset = isDragging.value ? dragOffset.value : scrollY.value;
    const ratio = maxScroll > 0 ? offset / maxScroll : 0;
    return {
      opacity: maxScroll > 0 ? thumbOpacity.value : 0,
      transform: [
        { translateY: ratio * trackHeight },
        { translateX: thumbTranslateX.value },
      ],
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
    const offset = isDragging.value ? dragOffset.value : scrollY.value;
    const rowIndex = findRowIndexForOffset(
      layout.rows,
      offset + viewportHeight * 0.25,
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
    width: SCROLL_TAB_THUMB_WIDTH,
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

export default memo(ScrollTab);
