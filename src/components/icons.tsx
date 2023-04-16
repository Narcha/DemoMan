import { SVGProps } from "react";

import { Icon, TablerIconsProps } from "@tabler/icons-react";

function svgProps(
  { color, size, stroke, ...other }: TablerIconsProps,
  name: string
): SVGProps<SVGSVGElement> {
  return {
    className: `icon icon-tabler icon-${name}`,
    width: size ?? 24,
    height: size ?? 24,
    stroke: color ?? "currentColor",
    strokeWidth: stroke ?? 2,
    viewBox: "0 0 24 24",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    xmlns: "http://www.w3.org/2000/svg",
    ...other,
  };
}

export const IconKillstreak: Icon = (props) => (
  <svg {...svgProps(props, "killstreak")}>
    <path stroke="none" d="M0 0h24v24H0z" />
    <path d="m 20,12 -8,8 H 4 L 12,12 4,4 h 8 z" />
    <path d="m 4.5,9 3,3 -3,3 z" fill="currentColor" />
  </svg>
);

export const IconStv: Icon = (props) => (
  <svg {...svgProps(props, "stv")}>
    <path stroke="none" d="M0 0h24v24H0z" />
    <path d="M 7,8 H 4 A 1,1 0 0 0 3,9 v 2 a 1,1 0 0 0 1,1 h 2 a 1,1 0 0 1 1,1 v 2 A 1,1 0 0 1 6,16 H 3" />
    <path d="M 12,16 V 8 m -2,0 h 4" />
    <path d="m 17,8 2,8 2,-8" />
  </svg>
);

export const IconPov: Icon = (props) => (
  <svg {...svgProps(props, "pov")}>
    <path stroke="none" d="M0 0h24v24H0z" />
    <path d="m 17,8 2,8 2,-8" />
    <path d="m 10,10 a 2,2 0 0 1 4,0 v 4 a 2,2 0 0 1 -4,0 z" />
    <path d="M 3,16 V 8 h 2 a 2,2 0 0 1 0,4 H 3" />
  </svg>
);
