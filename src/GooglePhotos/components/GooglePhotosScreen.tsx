import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  LayoutChangeEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedRef,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import {
  COLUMN_COUNTS,
  GRID_TOP_INSET,
  INITIAL_ZOOM_INDEX,
  PHOTOS,
} from '../constants';
import { useGooglePhotosGrid } from '../hooks/useGooglePhotosGrid';
import { useTouchIndicator } from '../hooks/useTouchIndicator';
import { computeJustifiedLayout } from '../utils';
import { ZoomLayout } from '../types';
import FullScreenPhoto from './FullScreenPhoto';
import GridList from './GridList';
import ScrollTab from './ScrollTab';
import TouchIndicator from './TouchIndicator';

if (COLUMN_COUNTS.length !== 3) {
  throw new Error('GooglePhotosScreen expects exactly 3 zoom levels');
}

export default function GooglePhotosScreen() {
  const { width, height } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(height);
  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
  }, []);

  const [activeLevel, setActiveLevel] = useState(INITIAL_ZOOM_INDEX);
  const activeLevelRef = useRef(activeLevel);
  activeLevelRef.current = activeLevel;

  const [layouts, setLayouts] = useState<(ZoomLayout | null)[]>(() =>
    COLUMN_COUNTS.map((columnCount, level) =>
      level === INITIAL_ZOOM_INDEX
        ? computeJustifiedLayout(PHOTOS, width, columnCount)
        : null,
    ),
  );

  const [warmedUp, setWarmedUp] = useState(false);

  const isFirstLayoutRef = useRef(true);
  useEffect(() => {
    if (isFirstLayoutRef.current) {
      isFirstLayoutRef.current = false;
    } else {
      const active = activeLevelRef.current;
      setLayouts(
        COLUMN_COUNTS.map((columnCount, level) =>
          level === active
            ? computeJustifiedLayout(PHOTOS, width, columnCount)
            : null,
        ),
      );
    }
    const task = InteractionManager.runAfterInteractions(() => {
      setLayouts((prev) =>
        prev.map(
          (layout, level) =>
            layout ??
            computeJustifiedLayout(PHOTOS, width, COLUMN_COUNTS[level]),
        ),
      );
      setWarmedUp(true);
    });
    return () => task.cancel();
  }, [width]);

  const currentLevel = useSharedValue(INITIAL_ZOOM_INDEX);
  useEffect(() => {
    currentLevel.value = activeLevel;
  }, [activeLevel, currentLevel]);

  const scroll0 = useSharedValue(0);
  const scroll1 = useSharedValue(0);
  const scroll2 = useSharedValue(0);
  const scrollOffsets = useMemo(
    () => [scroll0, scroll1, scroll2],
    [scroll0, scroll1, scroll2],
  );
  const ref0 = useAnimatedRef<Animated.ScrollView>();
  const ref1 = useAnimatedRef<Animated.ScrollView>();
  const ref2 = useAnimatedRef<Animated.ScrollView>();
  const listRefs = useMemo(() => [ref0, ref1, ref2], [ref0, ref1, ref2]);

  const scrollY = useDerivedValue(
    () => scrollOffsets[currentLevel.value].value,
  );

  const estimatedItemSizes = useMemo(
    () =>
      layouts.map((layout, level) =>
        layout && layout.listData.length > 0
          ? layout.contentHeight / layout.listData.length
          : width / COLUMN_COUNTS[level],
      ),
    [layouts, width],
  );

  const estimatedListSize = useMemo(
    () => ({ width, height: viewportHeight }),
    [width, viewportHeight],
  );

  const [fullScreenPhotoId, setFullScreenPhotoId] = useState<string | null>(
    null,
  );
  const [openSignal, setOpenSignal] = useState(0);
  const onOpenPhoto = useCallback((photoId: string) => {
    setFullScreenPhotoId(photoId);
    setOpenSignal((n) => n + 1);
  }, []);
  const fullScreenPhoto = useMemo(
    () => PHOTOS.find((photo) => photo.id === fullScreenPhotoId) ?? null,
    [fullScreenPhotoId],
  );
  const onClosed = useCallback(() => setFullScreenPhotoId(null), []);

  const onCommitLevel = useCallback(
    (target: number) => setActiveLevel(target),
    [],
  );

  const {
    gridGesture,
    gridGestureRef,
    targetLevel,
    progress,
    pinchActive,
    fsProgress,
    fsOpen,
    fsRectX,
    fsRectY,
    fsRectW,
    fsRectH,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  } = useGooglePhotosGrid({
    layouts,
    viewportHeight,
    scrollY,
    currentLevel,
    listRefs,
    onOpenPhoto,
    onClosePhoto: onClosed,
    onCommitLevel,
  });

  const {
    gesture: touchGesture,
    gestureRef: touchGestureRef,
    xs: touchXs,
    ys: touchYs,
    active: touchActive,
  } = useTouchIndicator();
  const gridGestureWithTouch = useMemo(
    () => Gesture.Simultaneous(gridGesture, touchGesture),
    [gridGesture, touchGesture],
  );
  const scrollSimultaneousHandlers = useMemo(
    () => [gridGestureRef, touchGestureRef],
    [gridGestureRef, touchGestureRef],
  );
  const touchPoints = useMemo(
    () => ({ xs: touchXs, ys: touchYs, active: touchActive }),
    [touchXs, touchYs, touchActive],
  );

  return (
    <View style={styles.root}>
      <View style={styles.container} onLayout={onViewportLayout}>
        <GestureDetector gesture={gridGestureWithTouch}>
          <View style={styles.viewport}>
            {layouts.map((layout, level) =>
              layout === null ? null : (
                <GridList
                  key={COLUMN_COUNTS[level]}
                  layout={layout}
                  level={level}
                  currentLevel={currentLevel}
                  targetLevel={targetLevel}
                  progress={progress}
                  active={level === activeLevel}
                  scrollEnabled={level === activeLevel}
                  scrollOffset={scrollOffsets[level]}
                  listScrollRef={listRefs[level]}
                  estimatedItemSize={estimatedItemSizes[level]}
                  estimatedListSize={estimatedListSize}
                  drawDistance={
                    level === activeLevel
                      ? viewportHeight
                      : viewportHeight * 0.25
                  }
                  scrollSimultaneousHandlers={scrollSimultaneousHandlers}
                  pinchActive={pinchActive}
                  onScrollEndDrag={
                    level === activeLevel ? onScrollEndDrag : undefined
                  }
                  onMomentumScrollBegin={
                    level === activeLevel ? onMomentumScrollBegin : undefined
                  }
                  onMomentumScrollEnd={
                    level === activeLevel ? onMomentumScrollEnd : undefined
                  }
                />
              ),
            )}
          </View>
        </GestureDetector>
        <ScrollTab
          layouts={layouts}
          viewportHeight={viewportHeight}
          scrollY={scrollY}
          currentLevel={currentLevel}
          listRefs={listRefs}
          pinchActive={pinchActive}
        />
      </View>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={fullScreenPhoto ? 'auto' : 'none'}
      >
        {warmedUp || fullScreenPhoto ? (
          <FullScreenPhoto
            photo={fullScreenPhoto}
            openSignal={openSignal}
            pinchActive={pinchActive}
            fsProgress={fsProgress}
            fsOpen={fsOpen}
            fsRectX={fsRectX}
            fsRectY={fsRectY}
            fsRectW={fsRectW}
            fsRectH={fsRectH}
            viewportHeight={viewportHeight}
            onClosed={onClosed}
            touchPoints={touchPoints}
          />
        ) : null}
      </View>
      <TouchIndicator xs={touchXs} ys={touchYs} active={touchActive} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1c1c1c',
  },
  container: {
    flex: 1,
    width: '100%',
    paddingTop: GRID_TOP_INSET,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
});
