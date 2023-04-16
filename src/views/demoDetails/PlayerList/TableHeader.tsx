import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  root: {
    width: "50%",
    height: "32px",
    // This accounts for the 8px of padding + 2px of margin of the table entries
    paddingInline: 10,
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[2]
        : theme.colors.gray[6],
  },
  playerColumn: {
    flexGrow: 1,
  },
  smallColumn: {
    width: "32px",
    textAlign: "right",
  },
  scoreColumn: {
    textAlign: "right",
  },
}));

export function TableHeader() {
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      <span className={classes.smallColumn}></span>
      <span className={classes.playerColumn}>Name</span>
      <span className={classes.scoreColumn}>
        Score
      </span>
      <span className={classes.smallColumn}>K</span>
      <span className={classes.smallColumn}>A</span>
      <span className={classes.smallColumn}>D</span>
    </div>
  );
}
