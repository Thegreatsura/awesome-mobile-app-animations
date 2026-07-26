import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  LayoutChangeEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { GestureDetector } from 'react-native-gesture-handler';
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
import { computeJustifiedLayout } from '../utils';
import { ZoomLayout } from '../types';
import FullScreenPhoto from './FullScreenPhoto';
import GridList from './GridList';
import ScrollTab from './ScrollTab';

const FULLSCREEN_PREFETCH_COUNT = 30;

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
    });
    return () => task.cancel();
  }, [width]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Image.prefetch(
        PHOTOS.slice(0, FULLSCREEN_PREFETCH_COUNT).map(
          (photo) => photo.fullUri,
        ),
        { cachePolicy: 'disk' },
      );
    });
    return () => task.cancel();
  }, []);

  const [zooming, setZooming] = useState(false);
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

  const [fullScreenPhotoId, setFullScreenPhotoId] = useState<string | null>(
    null,
  );
  const fullScreenPhoto = useMemo(
    () => PHOTOS.find((photo) => photo.id === fullScreenPhotoId) ?? null,
    [fullScreenPhotoId],
  );
  const onClosed = useCallback(() => setFullScreenPhotoId(null), []);

  const onZoomStart = useCallback(() => setZooming(true), []);
  const onZoomEnd = useCallback(() => setZooming(false), []);
  const onCommitLevel = useCallback(
    (target: number) => setActiveLevel(target),
    [],
  );

  const {
    gridGesture,
    targetLevel,
    progress,
    pinchActive,
    fsProgress,
    fsOpen,
    fsRectX,
    fsRectY,
    fsRectW,
    fsRectH,
  } = useGooglePhotosGrid({
    layouts,
    viewportHeight,
    scrollY,
    currentLevel,
    listRefs,
    onOpenPhoto: setFullScreenPhotoId,
    onClosePhoto: onClosed,
    onCommitLevel,
    onZoomStart,
    onZoomEnd,
  });

  return (
    <View style={styles.root}>
      <View style={styles.container} onLayout={onViewportLayout}>
        <GestureDetector gesture={gridGesture}>
          <View style={styles.viewport}>
            {layouts.map((layout, level) => (
              <GridList
                key={COLUMN_COUNTS[level]}
                layout={layout}
                level={level}
                currentLevel={currentLevel}
                targetLevel={targetLevel}
                progress={progress}
                active={level === activeLevel}
                scrollEnabled={level === activeLevel && !zooming}
                scrollOffset={scrollOffsets[level]}
                listScrollRef={listRefs[level]}
                estimatedItemSize={estimatedItemSizes[level]}
                drawDistance={
                  level === activeLevel ? viewportHeight : viewportHeight * 0.5
                }
              />
            ))}
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
        <FullScreenPhoto
          photo={fullScreenPhoto}
          fsProgress={fsProgress}
          fsOpen={fsOpen}
          fsRectX={fsRectX}
          fsRectY={fsRectY}
          fsRectW={fsRectW}
          fsRectH={fsRectH}
          viewportHeight={viewportHeight}
          onClosed={onClosed}
        />
      </View>
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
