import { useEffect, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Slim top progress bar that animates whenever the route changes.
 * Provides immediate feedback while the next page's lazy chunk
 * resolves and its data loads.
 */
const TopProgressBar = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip the very first render — no transition is happening yet.
    if (navType === "POP" && progress === 0 && !visible) {
      // still allow indicator on back/forward
    }

    setVisible(true);
    setProgress(15);

    const t1 = window.setTimeout(() => setProgress(55), 80);
    const t2 = window.setTimeout(() => setProgress(85), 220);
    const t3 = window.setTimeout(() => setProgress(100), 380);
    const t4 = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 580);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-0.5"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
};

export default TopProgressBar;
