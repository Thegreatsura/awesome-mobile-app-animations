import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import {
  FULLSCREEN_COMMIT_THRESHOLD,
  INITIAL_ZOOM_INDEX,
  PINCH_COMMIT_THRESHOLD,
  PINCH_ZOOM_IN_THROW,
  PINCH_ZOOM_OUT_THROW,
} from '../constants';
import { ZoomLayout } from '../types';
import { clampValue, findItemAtPoint } from '../utils';

export const useGooglePhotosGrid = ({
  layouts,
  viewportHeight,
  onOpenPhoto,
}: {
  layouts: ZoomLayout[];
  viewportHeight: number;
  onOpenPhoto: (photoId: string) => void;
}) => {
  const scrollY = useSharedValue(0);
  const currentLevel = useSharedValue(INITIAL_ZOOM_INDEX);
  const targetLevel = useSharedValue(INITIAL_ZOOM_INDEX);
  const progress = useSharedValue(0);
  const pinchActive = useSharedValue(false);
  const targetOffset = useSharedValue(0);

  const anchorId = useSharedValue('');
  const anchorViewportY = useSharedValue(0);
  const resolvedDirection = useSharedValue(0);
  const isFullscreenPinch = useSharedValue(false);

  const fsProgress = useSharedValue(0);
  const fsOpen = useSharedValue(false);
  const fsRectX = useSharedValue(0);
  const fsRectY = useSharedValue(0);
  const fsRectW = useSharedValue(1);
  const fsRectH = useSharedValue(1);

  const gridGesture = useMemo(() => {
    const maxScrollFor = (level: number) => {
      'worklet';
      return Math.max(0, layouts[level].contentHeight - viewportHeight);
    };

    const settleZoom = () => {
      'worklet';
      if (!pinchActive.value) {
        return;
      }
      cancelAnimation(progress);
      if (
        !isFullscreenPinch.value &&
        targetLevel.value !== currentLevel.value &&
        progress.value > PINCH_COMMIT_THRESHOLD
      ) {
        scrollY.value = targetOffset.value;
        currentLevel.value = targetLevel.value;
      }
      progress.value = 0;
      targetLevel.value = currentLevel.value;
      pinchActive.value = false;
    };

    const pan = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        settleZoom();
        cancelAnimation(scrollY);
      })
      .onChange((e) => {
        if (pinchActive.value || fsOpen.value) {
          return;
        }
        scrollY.value = clampValue(
          scrollY.value - e.changeY,
          0,
          maxScrollFor(currentLevel.value),
        );
      })
      .onEnd((e) => {
        if (pinchActive.value || fsOpen.value) {
          return;
        }
        scrollY.value = withDecay({
          velocity: -e.velocityY,
          clamp: [0, maxScrollFor(currentLevel.value)],
        });
      });

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        if (fsOpen.value) {
          return;
        }
        settleZoom();
        cancelAnimation(scrollY);
        cancelAnimation(progress);
        const layout = layouts[currentLevel.value];
        const item = findItemAtPoint(
          layout,
          e.focalX,
          scrollY.value + e.focalY,
        );
        anchorId.value = item.id;
        anchorViewportY.value = item.y + item.h / 2 - scrollY.value;
        resolvedDirection.value = 0;
        isFullscreenPinch.value = false;
        pinchActive.value = true;
      })
      .onUpdate((e) => {
        if (fsOpen.value) {
          return;
        }
        const direction = e.scale > 1.03 ? 1 : e.scale < 0.97 ? -1 : 0;
        if (direction !== 0 && resolvedDirection.value === 0) {
          resolvedDirection.value = direction;
          const level = currentLevel.value;
          const target = level + direction;
          if (target >= 0 && target < layouts.length) {
            isFullscreenPinch.value = false;
            targetLevel.value = target;
            const targetItem = layouts[target].itemById[anchorId.value];
            const targetCenterY = targetItem
              ? targetItem.y + targetItem.h / 2
              : 0;
            targetOffset.value = clampValue(
              targetCenterY - anchorViewportY.value,
              0,
              maxScrollFor(target),
            );
          } else if (target >= layouts.length) {
            isFullscreenPinch.value = true;
            targetLevel.value = level;
            const item = layouts[level].itemById[anchorId.value];
            if (item) {
              fsRectX.value = item.x;
              fsRectY.value = item.y - scrollY.value;
              fsRectW.value = item.w;
              fsRectH.value = item.h;
              runOnJS(onOpenPhoto)(item.id);
            }
          } else {
            isFullscreenPinch.value = false;
            targetLevel.value = level;
          }
        }
        if (isFullscreenPinch.value) {
          fsProgress.value = clampValue((e.scale - 1) / 2, 0, 1);
        } else if (targetLevel.value !== currentLevel.value) {
          progress.value =
            targetLevel.value > currentLevel.value
              ? clampValue((e.scale - 1) / PINCH_ZOOM_IN_THROW, 0, 1)
              : clampValue((1 - e.scale) / PINCH_ZOOM_OUT_THROW, 0, 1);
        } else {
          progress.value = 0;
        }
      })
      .onEnd(() => {
        if (fsOpen.value) {
          return;
        }
        if (isFullscreenPinch.value) {
          pinchActive.value = false;
          if (fsProgress.value > FULLSCREEN_COMMIT_THRESHOLD) {
            fsOpen.value = true;
            fsProgress.value = withTiming(1, { duration: 200 });
          } else {
            fsProgress.value = withTiming(0, { duration: 180 });
          }
          return;
        }
        if (
          targetLevel.value !== currentLevel.value &&
          progress.value > PINCH_COMMIT_THRESHOLD
        ) {
          progress.value = withTiming(1, { duration: 220 }, (finished) => {
            if (finished) {
              scrollY.value = targetOffset.value;
              currentLevel.value = targetLevel.value;
              progress.value = 0;
              pinchActive.value = false;
            }
          });
        } else {
          progress.value = withTiming(0, { duration: 180 }, (finished) => {
            if (finished) {
              targetLevel.value = currentLevel.value;
              pinchActive.value = false;
            }
          });
        }
      });

    const tap = Gesture.Tap()
      .maxDuration(250)
      .maxDistance(10)
      .onEnd((e, success) => {
        if (!success || pinchActive.value || fsOpen.value) {
          return;
        }
        cancelAnimation(scrollY);
        const layout = layouts[currentLevel.value];
        const item = findItemAtPoint(layout, e.x, scrollY.value + e.y);
        fsRectX.value = item.x;
        fsRectY.value = item.y - scrollY.value;
        fsRectW.value = item.w;
        fsRectH.value = item.h;
        runOnJS(onOpenPhoto)(item.id);
        fsOpen.value = true;
        fsProgress.value = withTiming(1, { duration: 260 });
      });

    return Gesture.Simultaneous(pinch, pan, tap);
  }, [
    layouts,
    viewportHeight,
    onOpenPhoto,
    scrollY,
    currentLevel,
    targetLevel,
    progress,
    pinchActive,
    targetOffset,
    anchorId,
    anchorViewportY,
    resolvedDirection,
    isFullscreenPinch,
    fsProgress,
    fsOpen,
    fsRectX,
    fsRectY,
    fsRectW,
    fsRectH,
  ]);

  return {
    gridGesture,
    scrollY,
    currentLevel,
    targetLevel,
    progress,
    pinchActive,
    targetOffset,
    fsProgress,
    fsOpen,
    fsRectX,
    fsRectY,
    fsRectW,
    fsRectH,
  };
};
