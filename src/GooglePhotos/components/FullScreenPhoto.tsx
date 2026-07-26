import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Photo } from '../types';
import { clampValue } from '../utils';
import { FULLSCREEN_DISMISS_THRESHOLD } from '../constants';

const FullScreenPhoto = ({
  photo,
  openSignal,
  pinchActive,
  fsProgress,
  fsOpen,
  fsRectX,
  fsRectY,
  fsRectW,
  fsRectH,
  viewportHeight,
  onClosed,
}: {
  photo: Photo | null;
  openSignal: number;
  pinchActive: SharedValue<boolean>;
  fsProgress: SharedValue<number>;
  fsOpen: SharedValue<boolean>;
  fsRectX: SharedValue<number>;
  fsRectY: SharedValue<number>;
  fsRectW: SharedValue<number>;
  fsRectH: SharedValue<number>;
  viewportHeight: number;
  onClosed: () => void;
}) => {
  const { width: viewportWidth } = useWindowDimensions();

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const lastPhotoRef = useRef<Photo | null>(null);
  if (photo) {
    lastPhotoRef.current = photo;
  }
  const displayPhoto = photo ?? lastPhotoRef.current;

  useEffect(() => {
    if (!photo || pinchActive.value || fsOpen.value) {
      return;
    }
    fsOpen.value = true;
    fsProgress.value = withTiming(1, { duration: 260 });
  }, [openSignal, photo, pinchActive, fsOpen, fsProgress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, 2 * fsProgress.value),
  }));

  const fitW = displayPhoto
    ? Math.min(viewportWidth, viewportHeight * displayPhoto.aspectRatio)
    : viewportWidth;
  const fitH = displayPhoto ? fitW / displayPhoto.aspectRatio : viewportHeight;
  const fitLeft = (viewportWidth - fitW) / 2;
  const fitTop = (viewportHeight - fitH) / 2;

  const photoStyle = useAnimatedStyle(() => {
    const p = fsProgress.value;
    const cellCenterX = fsRectX.value + fsRectW.value / 2;
    const cellCenterY = fsRectY.value + fsRectH.value / 2;
    return {
      opacity: p === 0 ? 0 : 1,
      transform: [
        {
          translateX:
            dragX.value +
            interpolate(p, [0, 1], [cellCenterX - viewportWidth / 2, 0]),
        },
        {
          translateY:
            dragY.value +
            interpolate(p, [0, 1], [cellCenterY - viewportHeight / 2, 0]),
        },
        { scale: interpolate(p, [0, 1], [fsRectW.value / fitW, 1]) },
      ],
    };
  }, [fitW, viewportWidth, viewportHeight]);

  const gesture = useMemo(() => {
    const close = Gesture.Tap()
      .maxDistance(10)
      .onEnd((_e, success) => {
        if (!success || !fsOpen.value) {
          return;
        }
        fsOpen.value = false;
        fsProgress.value = withTiming(0, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(onClosed)();
          }
        });
      });

    const pinchOut = Gesture.Pinch()
      .onUpdate((e) => {
        if (!fsOpen.value) {
          return;
        }
        fsProgress.value = clampValue(e.scale, 0, 1);
      })
      .onEnd(() => {
        if (!fsOpen.value) {
          return;
        }
        if (fsProgress.value < FULLSCREEN_DISMISS_THRESHOLD) {
          fsOpen.value = false;
          fsProgress.value = withTiming(0, { duration: 220 }, (finished) => {
            if (finished) {
              runOnJS(onClosed)();
            }
          });
        } else {
          fsProgress.value = withTiming(1, { duration: 180 });
        }
      });

    const pan = Gesture.Pan()
      .maxPointers(1)
      .onUpdate((e) => {
        if (!fsOpen.value) {
          return;
        }
        dragX.value = e.translationX;
        dragY.value = e.translationY;
        const drop = clampValue(
          Math.abs(e.translationY) / (viewportHeight / 6),
          0,
          1,
        );
        // Slight buffer for final animation
        fsProgress.value = Math.max(0.01, 1 - drop);
      })
      .onEnd((e) => {
        if (!fsOpen.value) {
          return;
        }
        const shouldDismiss =
          Math.abs(e.translationY) > 120 ||
          Math.abs(e.velocityY) > 800 ||
          fsProgress.value < FULLSCREEN_DISMISS_THRESHOLD;

        if (shouldDismiss) {
          fsOpen.value = false;
          dragX.value = withTiming(0, { duration: 220 });
          dragY.value = withTiming(0, { duration: 220 });
          fsProgress.value = withTiming(0, { duration: 220 }, (finished) => {
            if (finished) {
              runOnJS(onClosed)();
            }
          });
        } else {
          dragX.value = withTiming(0, { duration: 180 });
          dragY.value = withTiming(0, { duration: 180 });
          fsProgress.value = withTiming(1, { duration: 180 });
        }
      });

    return Gesture.Simultaneous(pinchOut, pan, close);
  }, [fsOpen, fsProgress, dragX, dragY, viewportHeight, onClosed]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.photoContainer,
            { left: fitLeft, top: fitTop, width: fitW, height: fitH },
            photoStyle,
          ]}
        >
          {displayPhoto ? (
            <View key={displayPhoto.id} style={StyleSheet.absoluteFill}>
              <Image
                source={{ uri: displayPhoto.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <Image
                source={{ uri: displayPhoto.fullUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  photoContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
});

export default FullScreenPhoto;
