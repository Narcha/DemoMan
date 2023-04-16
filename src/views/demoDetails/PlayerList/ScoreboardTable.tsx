import { createStyles } from "@mantine/core";

import { Scoreboard } from "../../../demo";

type ScoreboardTableProps = {
  scoreboard: Scoreboard;
};

function ScoreboardItem({ label, value }: { label: string; value: number }) {
  const { classes } = useStyles();

  return (
    <>
      <td className={classes.scoreLabel}>{label}:</td>
      <td data-value={value} className={classes.scoreValue}>
        {value}
      </td>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  root: {
    tableLayout: "fixed",
    width: "100%",
    background:
      theme.colorScheme === "dark"
        ? theme.colors.dark[9]
        : theme.colors.gray[1],
  },
  scoreLabel: {
    textAlign: "right",
  },
  scoreValue: {
    textAlign: "left",
    "&:not([data-value=\"0\"])": {
      color: theme.colors.green[5],
    },
  },
}));

export function ScoreboardTable({ scoreboard }: ScoreboardTableProps) {
  const { classes } = useStyles();

  return (
    <div>
      <table className={classes.root}>
        <tbody>
          <tr>
            <ScoreboardItem label="Kills" value={scoreboard.kills} />
            <ScoreboardItem label="Captures" value={scoreboard.captures} />
            <ScoreboardItem label="Invulns" value={scoreboard.ubercharges} />
            <ScoreboardItem label="Backstabs" value={scoreboard.backstabs} />
          </tr>
          <tr>
            <ScoreboardItem label="Deaths" value={scoreboard.deaths} />
            <ScoreboardItem label="Defenses" value={scoreboard.defenses} />
            <ScoreboardItem label="Headshots" value={scoreboard.headshots} />
            <ScoreboardItem label="Bonus" value={scoreboard.bonus_points} />
          </tr>
          <tr>
            <ScoreboardItem label="Assists" value={scoreboard.assists} />
            <ScoreboardItem
              label="Domination"
              value={scoreboard.dominations}
            />
            <ScoreboardItem label="Teleports" value={scoreboard.teleports} />
            <ScoreboardItem label="Support" value={scoreboard.support} />
          </tr>
          <tr>
            <ScoreboardItem
              label="Destruction"
              value={scoreboard.buildings_destroyed}
            />
            <ScoreboardItem label="Revenge" value={scoreboard.revenges} />
            <ScoreboardItem label="Healing" value={scoreboard.healing} />
            <ScoreboardItem label="Damage" value={scoreboard.damage_dealt} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
