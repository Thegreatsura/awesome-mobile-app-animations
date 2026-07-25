import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
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

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: fsProgress.value,
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
  }));

  const close = Gesture.Tap().onEnd((_e, success) => {
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

  if (!photo) {
    return null;
  }

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinchOut, close)}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.photoContainer, photoStyle]}>
          <Image
            source={{ uri: photo.fullUri }}
            style={styles.photo}
            resizeMode="contain"
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
    backgroundColor: '#2f2f2f',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});

export default FullScreenPhoto;
