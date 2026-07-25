import { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { COLUMN_COUNTS, PHOTOS } from '../constants';
import { useGooglePhotosGrid } from '../hooks/useGooglePhotosGrid';
import { computeJustifiedLayout } from '../utils';
import FullScreenPhoto from './FullScreenPhoto';
import GridLayer from './GridLayer';
import ScrollTab from './ScrollTab';

export default function GooglePhotosScreen() {
  const { width, height } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(height);
  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
  }, []);

  const layouts = useMemo(
    () =>
      COLUMN_COUNTS.map((columnCount) =>
        computeJustifiedLayout(PHOTOS, width, columnCount),
      ),
    [width],
  );
  const contentHeights = useMemo(
    () => layouts.map((layout) => layout.contentHeight),
    [layouts],
  );

  const [fullScreenPhotoId, setFullScreenPhotoId] = useState<string | null>(
    null,
  );
  const fullScreenPhoto = useMemo(
    () => PHOTOS.find((photo) => photo.id === fullScreenPhotoId) ?? null,
    [fullScreenPhotoId],
  );
  const onClosed = useCallback(() => setFullScreenPhotoId(null), []);

  const {
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
  } = useGooglePhotosGrid({
    layouts,
    viewportHeight,
    onOpenPhoto: setFullScreenPhotoId,
  });

  return (
    <View style={styles.container} onLayout={onViewportLayout}>
      <GestureDetector gesture={gridGesture}>
        <View style={styles.viewport}>
          {layouts.map((layout, level) => (
            <GridLayer
              key={layout.columnCount}
              layout={layout}
              level={level}
              viewportHeight={viewportHeight}
              contentHeights={contentHeights}
              scrollY={scrollY}
              currentLevel={currentLevel}
              targetLevel={targetLevel}
              progress={progress}
              pinchActive={pinchActive}
              targetOffset={targetOffset}
            />
          ))}
        </View>
      </GestureDetector>
      <ScrollTab
        layouts={layouts}
        viewportHeight={viewportHeight}
        scrollY={scrollY}
        currentLevel={currentLevel}
      />
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
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1c1c1c',
    paddingTop: 80,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
});
