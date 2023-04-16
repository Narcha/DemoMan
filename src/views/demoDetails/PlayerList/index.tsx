import { useMemo, useState } from "react";

import {
  createStyles,
  Divider,
  Paper,
  ScrollArea,
  Tabs,
  Text,
  Title,
} from "@mantine/core";

import { EMPTY_SCOREBOARD, GameSummary, PlayerSummary } from "../../../demo";
import { PlayerBox } from "./PlayerBox";
import { ScoreboardTable } from "./ScoreboardTable";
import { TableHeader } from "./TableHeader";

export type PlayerListProps = {
  gameSummary: GameSummary;
};

const useStyles = createStyles((theme) => ({
  paper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    overflow: "hidden",
  },
  header: {
    width: "50%",
    display: "inline-flex",
    justifyContent: "space-between",
    padding: "8px",
  },
  divider: {
    height: "4px",
    width: "100%",
    background: `linear-gradient(90deg,\
        ${theme.colors.blue[7]} 0%,\
        ${theme.colors.blue[7]} 50%,\
        ${theme.colors.red[7]} 50%,\
        ${theme.colors.red[7]} 100%\
        )`,
  },
  playerListColumn: {
    width: "50%",
    display: "inline-block",
    verticalAlign: "top",
  },
  scoreboardPlayerNameHeader: {
    paddingLeft: 8,
  },
}));

export default function PlayerList({ gameSummary }: PlayerListProps) {
  const { classes } = useStyles();

  const [redPlayers, bluPlayers, _others] = useMemo(() => {
    const redPlayers: PlayerSummary[] = [];
    const bluPlayers: PlayerSummary[] = [];
    const others: PlayerSummary[] = [];

    gameSummary.players.forEach((player) => {
      if (player.team === "red") {
        redPlayers.push(player);
      } else if (player.team === "blue") {
        bluPlayers.push(player);
      } else {
        others.push(player);
      }
    });

    // TODO: Allow the tables to be sorted by the column headers (kills, deaths, etc)
    // TODO: Maybe add a button to export the match data as JSON?
    redPlayers.sort((a, b) => b.scoreboard?.points - a.scoreboard?.points);
    bluPlayers.sort((a, b) => b.scoreboard?.points - a.scoreboard?.points);
    return [redPlayers, bluPlayers, others];
  }, [gameSummary]);

  const mainPlayer: PlayerSummary | null =
    gameSummary.players.find((p) => p.user_id === gameSummary.local_user_id) ??
    null;

  const [currentPlayer, setCurrentPlayer] = useState(mainPlayer);
  const [currentScoreboard, setCurrentScoreboard] = useState(
    mainPlayer?.scoreboard
  );

  // currentTab will be either the round number (0..n), or "match" to display the scoreboard for the entire game
  const [currentTab, setCurrentTab] = useState<string | number>("match");

  /**
   * Creates a function for use on player selection.  This will set set the scoreboard to
   * display the board for the currently selected round (or match, if that tab is selected).
   * If the player has no scoreboard for that round, this will switch the selected tab
   * back to the match tab and display that scoreboard instead.
   */
  function createPlayerSelectionCallback(player: PlayerSummary) {
    return () => {
      setCurrentPlayer(player);
      if (currentTab === "match") {
        setCurrentScoreboard(player.scoreboard);
      } else {
        const roundNum = currentTab as unknown as number;
        const roundScoreboard = player?.round_scoreboards[roundNum];
        if (roundScoreboard !== undefined) {
          setCurrentScoreboard(roundScoreboard);
        } else {
          setCurrentTab("match");
          setCurrentScoreboard(player?.scoreboard ?? EMPTY_SCOREBOARD);
        }
      }
    };
  }

  return (
    <Paper radius="md" className={classes.paper} withBorder>
      {/* Header */}
      <div>
        <div className={classes.header}>
          <Text size={30} weight={600} color="blue.7">
            BLU
          </Text>
          <Text size={30} weight={600} color="blue.7">
            {gameSummary.blue_team_score}
          </Text>
        </div>
        <div className={classes.header}>
          <Text size={30} weight={600} color="red.7">
            {gameSummary.red_team_score}
          </Text>
          <Text size={30} weight={600} color="red.7">
            RED
          </Text>
        </div>
      </div>
      {/* Divider */}
      <div className={classes.divider} />
      {/* Table header */}
      <div>
        <TableHeader />
        <TableHeader />
      </div>
      <Divider/>
      {/* Player list */}
      <ScrollArea.Autosize mah={360}>
        <div>
          <div className={classes.playerListColumn}>
            {bluPlayers.map((player) => (
              <PlayerBox
                key={player.user_id}
                player={player}
                onClick={createPlayerSelectionCallback(player)}
                selected={player.user_id === currentPlayer?.user_id}
              />
            ))}
          </div>
          <div className={classes.playerListColumn}>
            {redPlayers.map((player) => (
              <PlayerBox
                key={player.user_id}
                onClick={createPlayerSelectionCallback(player)}
                player={player}
                selected={player.user_id === currentPlayer?.user_id}
              />
            ))}
          </div>
        </div>
      </ScrollArea.Autosize>
      {/* Divider above the scoreboard*/}
      <Divider />
      <div className={classes.scoreboardPlayerNameHeader}>
        <Title>{currentPlayer?.name ?? ""}</Title>
      </div>
      <div>
        <Tabs defaultValue={"match"} value={currentTab.toString()}>
          <Tabs.List>
            <Tabs.Tab
              value={"match"}
              onClick={() => {
                setCurrentTab("match");
                setCurrentScoreboard(
                  currentPlayer?.scoreboard ?? EMPTY_SCOREBOARD
                );
              }}
            >
              Match
            </Tabs.Tab>
            {Array.from({ length: gameSummary.num_rounds }, (x, i) => i).map(
              (roundNum) => {
                return (
                  <Tabs.Tab
                    value={`${roundNum}`}
                    key={roundNum}
                    disabled={
                      (currentPlayer?.round_scoreboards[roundNum] ?? null) ===
                      null
                    } // disable if the player wasn't in this round
                    onClick={() => {
                      const roundScoreboard =
                        currentPlayer?.round_scoreboards[roundNum];
                      if (roundScoreboard !== undefined) {
                        setCurrentTab(roundNum);
                        setCurrentScoreboard(roundScoreboard);
                      } else {
                        setCurrentTab("match");
                        setCurrentScoreboard(
                          currentPlayer?.scoreboard ?? EMPTY_SCOREBOARD
                        );
                      }
                    }}
                  >
                    Round {roundNum + 1}
                  </Tabs.Tab>
                );
              }
            )}
          </Tabs.List>
        </Tabs>
        {/* The actual scoreboard component.  This will be updated when players or tabs are clicked, rather than creating an entirely new component */}
        <ScoreboardTable scoreboard={currentScoreboard ?? EMPTY_SCOREBOARD} />
      </div>
    </Paper>
  );
}
