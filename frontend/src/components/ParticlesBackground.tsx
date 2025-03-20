// src/components/ParticlesBackground.tsx
import React, { useCallback } from "react";
import { Engine } from "@tsparticles/engine";
import { loadFull } from "tsparticles";
import { Particles } from "@tsparticles/react";
import "../styles/particles.css";

const ParticlesBackground: React.FC = () => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  const particlesOptions = {
    particles: {
      number: { value: 80, density: { enable: true, value_area: 800 } },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: 0.5 },
      size: { value: 10, random: true },
      links: { enable: true, color: "#ffffff", distance: 150 },
      move: { enable: true, speed: 2 },
    },
    interactivity: {
      events: {
        onHover: { enable: true, mode: "repulse" },
        onClick: { enable: true, mode: "push" },
      },
      modes: {
        repulse: { distance: 200 },
        push: { quantity: 4 },
      },
    },
    retina_detect: true,
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={particlesOptions}
      className="particles-no-pointer"
    />
  );
};

export default ParticlesBackground;
