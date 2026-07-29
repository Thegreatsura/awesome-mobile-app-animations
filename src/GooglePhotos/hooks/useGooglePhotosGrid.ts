import { useMemo, useRef } from 'react';
import { Gesture, GestureType } from 'react-native-gesture-handler';
import Animated, {
  AnimatedRef,
  SharedValue,
  cancelAnimation,
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  FULLSCREEN_COMMIT_THRESHOLD,
  GRID_TOP_INSET,
  INITIAL_ZOOM_INDEX,
  PINCH_COMMIT_THRESHOLD,
  PINCH_ZOOM_IN_THROW,
  PINCH_ZOOM_OUT_THROW,
  SYNC_SCROLL_DELAY_BY_LEVEL,
  SYNC_SCROLL_RESCHEDULE_THRESHOLD_BY_LEVEL,
} from '../constants';
import { ZoomLayout } from '../types';
import { clampValue, findItemAtPoint } from '../utils';

export const useGooglePhotosGrid = ({
  layouts,
  viewportHeight,
  scrollY,
  currentLevel,
  listRefs,
  onOpenPhoto,
  onClosePhoto,
  onCommitLevel,
}: {
  layouts: (ZoomLayout | null)[];
  viewportHeight: number;
  scrollY: SharedValue<number>;
  currentLevel: SharedValue<number>;
  listRefs: AnimatedRef<Animated.ScrollView>[];
  onOpenPhoto: (photoId: string) => void;
  onClosePhoto: () => void;
  onCommitLevel: (targetLevel: number) => void;
}) => {
  const targetLevel = useSharedValue(INITIAL_ZOOM_INDEX);
  const progress = useSharedValue(0);
  const pinchActive = useSharedValue(false);
  const targetOffset = useSharedValue(0);

  // Referenced by the scroll views' `simultaneousHandlers` so pinch/tap keep
  // working alongside the gesture-handler ScrollView.
  const gridGestureRef = useRef<GestureType | undefined>(undefined);

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

  const syncPulse = useSharedValue(0);
  const lastSyncScheduleY = useSharedValue(0);
  useAnimatedReaction(
    () => scrollY.value,
    (value, previous) => {
      if (previous === null || value === previous) {
        return;
      }
      if (pinchActive.value || fsOpen.value) {
        return;
      }
      const level = currentLevel.value;
      if (
        Math.abs(value - lastSyncScheduleY.value) <
        SYNC_SCROLL_RESCHEDULE_THRESHOLD_BY_LEVEL[level]
      ) {
        return;
      }
      lastSyncScheduleY.value = value;
      cancelAnimation(syncPulse);
      syncPulse.value = 0;
      syncPulse.value = withDelay(
        SYNC_SCROLL_DELAY_BY_LEVEL[level],
        withTiming(1, { duration: 16 }, (finished) => {
          if (!finished || pinchActive.value || fsOpen.value) {
            return;
          }
          const level = currentLevel.value;
          const currentLayout = layouts[level];
          if (!currentLayout) {
            return;
          }
          const maxCurrent = Math.max(
            0,
            currentLayout.contentHeight - viewportHeight,
          );
          const ratio = maxCurrent > 0 ? scrollY.value / maxCurrent : 0;
          for (let target = 0; target < layouts.length; target++) {
            if (target === level) {
              continue;
            }
            const targetLayout = layouts[target];
            if (!targetLayout) {
              continue;
            }
            const maxTarget = Math.max(
              0,
              targetLayout.contentHeight - viewportHeight,
            );
            scrollTo(listRefs[target], 0, ratio * maxTarget, false);
          }
        }),
      );
    },
    [layouts, viewportHeight, listRefs],
  );

  const gridGesture = useMemo(() => {
    const maxScrollFor = (level: number) => {
      'worklet';
      const l = layouts[level];
      return l ? Math.max(0, l.contentHeight - viewportHeight) : 0;
    };

    const pinch = Gesture.Pinch()
      .withRef(gridGestureRef)
      .onStart((e) => {
        if (fsOpen.value) {
          return;
        }
        cancelAnimation(progress);
        cancelAnimation(syncPulse);
        progress.value = 0;
        targetLevel.value = currentLevel.value;
        const layout = layouts[currentLevel.value];
        if (!layout) {
          return;
        }
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
        for (let dir = -1; dir <= 1; dir += 2) {
          const target = currentLevel.value + dir;
          const targetLayout =
            target >= 0 && target < layouts.length ? layouts[target] : null;
          if (!targetLayout) {
            continue;
          }
          const targetItem = targetLayout.itemById[item.id];
          const targetCenterY = targetItem
            ? targetItem.y + targetItem.h / 2
            : 0;
          scrollTo(
            listRefs[target],
            0,
            clampValue(
              targetCenterY - anchorViewportY.value,
              0,
              maxScrollFor(target),
            ),
            false,
          );
        }
      })
      .onUpdate((e) => {
        if (fsOpen.value || !pinchActive.value) {
          return;
        }
        const direction = e.scale > 1.03 ? 1 : e.scale < 0.97 ? -1 : 0;
        if (direction !== 0 && resolvedDirection.value === 0) {
          resolvedDirection.value = direction;
          const level = currentLevel.value;
          const target = level + direction;
          const targetLayout =
            target >= 0 && target < layouts.length ? layouts[target] : null;
          if (targetLayout) {
            isFullscreenPinch.value = false;
            targetLevel.value = target;
            const targetItem = targetLayout.itemById[anchorId.value];
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
            const currentLayout = layouts[level];
            const item = currentLayout
              ? currentLayout.itemById[anchorId.value]
              : undefined;
            if (item) {
              fsRectX.value = item.x;
              fsRectY.value = item.y - scrollY.value + GRID_TOP_INSET;
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
            fsProgress.value = withTiming(0, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(onClosePhoto)();
              }
            });
          }
          return;
        }
        if (
          targetLevel.value !== currentLevel.value &&
          progress.value > PINCH_COMMIT_THRESHOLD
        ) {
          const committed = targetLevel.value;
          progress.value = withTiming(1, { duration: 220 }, (finished) => {
            if (finished) {
              currentLevel.value = committed;
              targetLevel.value = committed;
              progress.value = 0;
              pinchActive.value = false;
              runOnJS(onCommitLevel)(committed);
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
        const layout = layouts[currentLevel.value];
        if (!layout) {
          return;
        }
        const item = findItemAtPoint(layout, e.x, scrollY.value + e.y);
        fsRectX.value = item.x;
        fsRectY.value = item.y - scrollY.value + GRID_TOP_INSET;
        fsRectW.value = item.w;
        fsRectH.value = item.h;
        runOnJS(onOpenPhoto)(item.id);
      });

    return Gesture.Simultaneous(pinch, tap);
  }, [
    layouts,
    viewportHeight,
    listRefs,
    onOpenPhoto,
    onClosePhoto,
    onCommitLevel,
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
    syncPulse,
    fsProgress,
    fsOpen,
    fsRectX,
    fsRectY,
    fsRectW,
    fsRectH,
  ]);

  return {
    gridGesture,
    gridGestureRef,
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
