import { MutableRefObject, useMemo, useRef } from 'react';
import { Gesture, GestureType } from 'react-native-gesture-handler';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

export const MAX_TOUCH_POINTS = 2;

export interface TouchPoints {
  xs: SharedValue<number>[];
  ys: SharedValue<number>[];
  active: SharedValue<number>[];
}

export const buildTouchTrackerGesture = (
  { xs, ys, active }: TouchPoints,
  ref?: MutableRefObject<GestureType | undefined>,
) => {
  const apply = (touches: { absoluteX: number; absoluteY: number }[]) => {
    'worklet';
    for (let i = 0; i < MAX_TOUCH_POINTS; i++) {
      if (i < touches.length) {
        xs[i].value = touches[i].absoluteX;
        ys[i].value = touches[i].absoluteY;
        active[i].value = 1;
      } else {
        active[i].value = 0;
      }
    }
  };

  const gesture = ref ? Gesture.Manual().withRef(ref) : Gesture.Manual();
  return gesture
    .onTouchesDown((e) => {
      'worklet';
      apply(e.allTouches);
    })
    .onTouchesMove((e) => {
      'worklet';
      apply(e.allTouches);
    })
    .onTouchesUp((e) => {
      'worklet';
      const remaining: { absoluteX: number; absoluteY: number }[] = [];
      for (let i = 0; i < e.allTouches.length; i++) {
        const t = e.allTouches[i];
        let lifted = false;
        for (let j = 0; j < e.changedTouches.length; j++) {
          if (e.changedTouches[j].id === t.id) {
            lifted = true;
            break;
          }
        }
        if (!lifted) {
          remaining.push(t);
        }
      }
      apply(remaining);
    })
    .onTouchesCancelled(() => {
      'worklet';
      apply([]);
    });
};

export const useTouchIndicator = () => {
  const x0 = useSharedValue(0);
  const x1 = useSharedValue(0);
  const y0 = useSharedValue(0);
  const y1 = useSharedValue(0);
  const a0 = useSharedValue(0);
  const a1 = useSharedValue(0);

  const xs = useMemo(() => [x0, x1], [x0, x1]);
  const ys = useMemo(() => [y0, y1], [y0, y1]);
  const active = useMemo(() => [a0, a1], [a0, a1]);

  const ref = useRef<GestureType | undefined>(undefined);

  const gesture = useMemo(
    () => buildTouchTrackerGesture({ xs, ys, active }, ref),
    [xs, ys, active],
  );

  return { gesture, gestureRef: ref, xs, ys, active };
};
