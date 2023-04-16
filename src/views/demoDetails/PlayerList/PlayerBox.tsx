import { createStyles, Text } from "@mantine/core";
import ClassIcon from "../../../components/ClassIcon";

import { PlayerSummary } from "../../../demo";

interface PlayerBoxProps {
  player: PlayerSummary;
  selected: boolean;
  onClick: () => void;
}

const useStyles = createStyles(
  (theme, { selected }: { selected: boolean }) => ({
    root: {
      height: "40px",
      display: "flex",
      alignItems: "center",
      padding: 8,
      margin: 2,
      borderRadius: theme.fn.radius("sm"),
      backgroundColor: selected
        ? theme.fn.rgba(theme.colors[theme.primaryColor][8], 0.3)
        : "transparent",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: selected
          ? theme.fn.rgba(theme.colors[theme.primaryColor][6], 0.3)
          : theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[3],
      },
    },
    classIcon: {
      marginRight: 8,
      width: 24,
    },
    playerName: {
      textOverflow: "ellipsis",
      overflow: "hidden",
      whiteSpace: "nowrap",
    },
    pointsScoreboardValue: {
      textAlign: "right",
    },
    simpleScoreboardValue: {
      width: 32,
      textAlign: "right",
    },
  })
);

export function PlayerBox({ player, selected, onClick }: PlayerBoxProps) {
  const { classes } = useStyles({ selected });

  return (
    <div onClick={onClick} className={classes.root}>
      <div className={classes.classIcon}>
        {player.classes.length !== 0 && (
          <ClassIcon cls={player.classes[0]} size={24} />
        )}
      </div>
      <div style={{ flexGrow: 1 }}>
        <Text className={classes.playerName}>{player.name}</Text>
      </div>
      {/* TODO: Show player's dominations */}
      <div className={classes.pointsScoreboardValue}>
        {player.scoreboard.points}
      </div>
      <div className={classes.simpleScoreboardValue}>
        {player.scoreboard.kills}
      </div>
      <div className={classes.simpleScoreboardValue}>
        {player.scoreboard.assists}
      </div>
      <div className={classes.simpleScoreboardValue}>
        {player.scoreboard.deaths}
      </div>
    </div>
  );
}
