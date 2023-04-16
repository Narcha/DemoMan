import { createStyles } from "@mantine/core";

import ScoutIcon from "../assets/class_icons/scout.png";
import SniperIcon from "../assets/class_icons/sniper.png";
import SoldierIcon from "../assets/class_icons/soldier.png";
import DemomanIcon from "../assets/class_icons/demoman.png";
import MedicIcon from "../assets/class_icons/medic.png";
import HeavyIcon from "../assets/class_icons/heavy.png";
import PyroIcon from "../assets/class_icons/pyro.png";
import SpyIcon from "../assets/class_icons/spy.png";
import EngineerIcon from "../assets/class_icons/engineer.png";
import { Class, stringifyClass } from "../demo";

/*
  Class mapping:
  --------------
  Other = 0,
  Scout = 1,
  Sniper = 2,
  Soldier = 3,
  Demoman = 4,
  Medic = 5,
  Heavy = 6,
  Pyro = 7,
  Spy = 8,
  Engineer = 9
*/

const classIconMap = [
  ScoutIcon,
  SniperIcon,
  SoldierIcon,
  DemomanIcon,
  MedicIcon,
  HeavyIcon,
  PyroIcon,
  SpyIcon,
  EngineerIcon,
];

const useStyles = createStyles(
  (theme, { size }: { size: number }) => ({
    root: {
      width: size ?? 32,
      height: size ?? 32,
    },
  })
);

export type ClassIconProps = {
  cls: Class;
  size?: number;
};

export default function ClassIcon({
  cls,
  size = 32,
}: ClassIconProps) {
  const { classes } = useStyles({ size });

  return (
    <img
      alt={stringifyClass(cls)}
      src={classIconMap[cls]}
      className={classes.root}
    />
  );
}
