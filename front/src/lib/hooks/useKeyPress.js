import { useState, useEffect } from "react";

// Hook
function useKeyPress(targetKey) {
  const [keyPressed, setKeyPressed] = useState(false);
  const downHandler = ({ key }) => key === targetKey && setKeyPressed(true);
  const upHandler = ({ key }) => key === targetKey && setKeyPressed(false);

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
