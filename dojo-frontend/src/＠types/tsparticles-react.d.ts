// src/@types/tsparticles-react.d.ts
declare module "@tsparticles/react" {
  import { ISourceOptions } from "tsparticles";
  import { Engine } from "tsparticles";
  import { FC, CSSProperties } from "react";

  export interface IParticlesProps {
    id?: string;
    options?: ISourceOptions;
    init?: (engine: Engine) => void;
    loaded?: (container?: any) => void;
    className?: string;
    style?: CSSProperties;
  }

  export const Particles: FC<IParticlesProps>;
}
