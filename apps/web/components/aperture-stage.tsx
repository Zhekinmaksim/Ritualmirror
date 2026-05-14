"use client";

import { useEffect, useState } from "react";
import ApertureScene from "@/app/ApertureScene";

export function ApertureStage() {
  const [renderScene, setRenderScene] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowCoreDevice = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
    setRenderScene(!reducedMotion && !lowCoreDevice);
  }, []);

  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(214,163,92,0.12),rgba(7,8,10,0)_22rem)]" />
      {renderScene ? <ApertureScene /> : null}
    </>
  );
}
