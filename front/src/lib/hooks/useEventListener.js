import { useRef, useEffect, useCallback } from "react";

// Hook
function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, []);

  useEffect(
    () => {
      const isSupported = element && element.addEventListener;
      if (!isSupported) return;

      const eventListener = event => savedHandler.current(event);

      element.addEventListener(eventName, eventListener);

      return () => {
        element.removeEventListener(eventName, eventListener);
      };
    },
    [eventName, element], // Re-run if eventName or element changes
  );
}

export default useEventListener;
