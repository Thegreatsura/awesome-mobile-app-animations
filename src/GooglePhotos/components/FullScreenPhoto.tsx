import { StyleSheet, useWindowDimensions } from 'react-native';
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

const FullScreenPhoto = ({
  photo,
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

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, 2 * fsProgress.value),
  }));

  const photoStyle = useAnimatedStyle(() => ({
    left: interpolate(fsProgress.value, [0, 1], [fsRectX.value, 0]),
    top: interpolate(fsProgress.value, [0, 1], [fsRectY.value, 0]),
    width: interpolate(
      fsProgress.value,
      [0, 1],
      [fsRectW.value, viewportWidth],
    ),
    height: interpolate(
      fsProgress.value,
      [0, 1],
      [fsRectH.value, viewportHeight],
    ),
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }));

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
      if (fsProgress.value < 0.7) {
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
        Math.abs(e.translationY) / (viewportHeight * 0.5),
        0,
        1,
      );
      fsProgress.value = 1 - 5 * drop;
    })
    .onEnd((e) => {
      if (!fsOpen.value) {
        return;
      }
      const dismiss =
        Math.abs(e.translationY) > 120 || Math.abs(e.velocityY) > 800;
      if (dismiss) {
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

  if (!photo) {
    return null;
  }

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinchOut, pan, close)}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.photoContainer, photoStyle]}>
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
          <Image
            source={{ uri: photo.fullUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={200}
          />
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
