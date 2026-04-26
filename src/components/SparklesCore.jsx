import { useEffect, useId, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export function SparklesCore({
  id,
  className = "",
  background = "transparent",
  minSize = 0.7,
  maxSize = 2.4,
  speed = 3,
  particleColor = "#ffffff",
  particleDensity = 115,
}) {
  const [init, setInit] = useState(false);
  const generatedId = useId();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options = useMemo(
    () => ({
      background: { color: { value: background } },
      fullScreen: { enable: false, zIndex: 1 },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: false, mode: "repulse" },
          resize: { enable: true },
        },
        modes: {
          push: { quantity: 4 },
          repulse: { distance: 200, duration: 0.4 },
        },
      },
      particles: {
        color: { value: particleColor },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "out" },
          random: true,
          speed: { min: 0.015, max: 0.12 },
          straight: false,
        },
        number: {
          density: { enable: true, width: 400, height: 400 },
          value: particleDensity,
        },
        opacity: {
          value: { min: 0.18, max: 0.82 },
          animation: {
            enable: false,
            speed,
            sync: false,
            mode: "auto",
            startValue: "random",
            destroy: "none",
          },
        },
        shape: { type: "circle" },
        size: {
          value: { min: minSize, max: maxSize },
          animation: { enable: false },
        },
      },
      detectRetina: true,
    }),
    [background, maxSize, minSize, particleColor, particleDensity, speed],
  );

  return (
    <div className={`sparkles-core ${init ? "ready" : ""} ${className}`}>
      {init && (
        <Particles
          id={id || generatedId}
          className="sparkles-particles"
          particlesLoaded={() => undefined}
          options={options}
        />
      )}
    </div>
  );
}
