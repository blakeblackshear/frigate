// https://gist.github.com/cpojer/641bf305e6185006ea453e7631b80f95

import { useCallback, useState } from "react";
import {
  LongPressCallbackMeta,
  LongPressReactEvents,
  useLongPress,
} from "use-long-press";

export default function usePress(
  options: Omit<Parameters<typeof useLongPress>[1], "onCancel" | "onStart"> & {
    onLongPress: NonNullable<Parameters<typeof useLongPress>[0]>;
    onPress: (event: LongPressReactEvents<Element>) => void;
  },
) {
  const { onLongPress, onPress, ...actualOptions } = options;
  const [hasLongPress, setHasLongPress] = useState(false);

  const onCancel = useCallback(() => {
    if (hasLongPress) {
      setHasLongPress(false);
    }
  }, [hasLongPress]);

  const bind = useLongPress(
    useCallback(
      (
        event: LongPressReactEvents<Element>,
        meta: LongPressCallbackMeta<unknown>,
      ) => {
        setHasLongPress(true);
        onLongPress(event, meta);
      },
      [onLongPress],
    ),
    {
      ...actualOptions,
      onCancel,
      onStart: onCancel,
    },
  );

  return useCallback(
    () => ({
      ...bind(),
      onClick: (event: LongPressReactEvents<HTMLDivElement>) => {
        if (!hasLongPress) {
          onPress(event);
        }
      },
    }),
    [bind, hasLongPress, onPress],
  );
}
