import { useState, useEffect, useCallback } from "react";

// Hook
function useKeyPress(targetKey) {
  const [keyPressed, setKeyPressed] = useState(false);
  const downHandler = useCallback(({ key }) => key === targetKey && setKeyPressed(true), [targetKey]);
  const upHandler = useCallback(({ key }) => key === targetKey && setKeyPressed(false), [targetKey]);

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []);

  return keyPressed;
}

export default useKeyPress;
