import { createStyles, useMantineTheme } from "@mantine/core";

import {
  ChatMessageHighlight,
  AirshotHighlight,
  CrossbowAirshotHighlight,
  Highlight,
  KillHighlight,
  PointCapturedHighlight,
  RoundWinHighlight,
  PlayerConnectedHighlight,
  PlayerDisconnectedHighlight,
  UserId,
  PlayerSummary,
  TEAM_NAMES,
  HighlightPlayerSnapshot,
  Team,
  KillStreakHighlight,
  KillStreakEndedHighlight,
} from "../../demo";
import { KillIcon } from "../../components";
import KillstreakIcon from "../../components/KillstreakIcon";
import CapturePoints from "../../assets/translations/capture_points.json";

type HighlightProps = {
  event: Highlight;
  playerMap: Map<UserId, PlayerSummary>;
};

const useStyles = createStyles(
  (
    theme,
    {
      justifyContent,
    }: { justifyContent: React.CSSProperties["justifyContent"] }
  ) => ({
    root: {
      flexGrow: 1,
      display: "flex",
      alignItems: "center",
      justifyContent,
      height: 40,
      paddingRight: 16,
    },
  })
);

type PlayerNameProps = {
  player: PlayerSummary | HighlightPlayerSnapshot | undefined;
  /**
   * The team the player is on.  Used to override the team color on the player object.
   * This can be helpful in the uncommon cases where the player's team is set to "other".
   */
  team?: Team | number;
};

function PlayerName({ player, team = undefined }: PlayerNameProps) {
  const theme = useMantineTheme();
  let color = "unset";
  const name = player?.name ?? "<unknown>";

  if (team !== undefined) {
    switch (team) {
      case "red":
      case 2: // red team number
        color = theme.colors.red[6];
        break;
      case "blue":
      case 3: // blue team number
        color = theme.colors.blue[6];
        break;
      default: // no team specified
        break;
    }
  }

  if (color === "unset") {
    if (player !== undefined) {
      if (player.team === "red") {
        color = theme.colors.red[6];
      } else if (player.team === "blue") {
        color = theme.colors.blue[6];
      } else {
        // No team was specified and the player isn't associated with a team (did we miss an m_iTeam update?)
      }
    }
  }
  return <span style={{ color }}>{name}</span>;
}

/**
 * Returns an array equivalent to the given one, but with filler objects between every original value.
 *
 * @param array
 * @param filler
 */
const injectBetween = function <T>(
  array: T[],
  filler: (index: number) => T
): T[] {
  const output: T[] = [];
  array.forEach((value, i) => {
    output.push(value);
    if (i < array.length - 1) {
      output.push(filler(i));
    }
  });
  return output;
};

function PlayerNames({
  players,
  team,
}: {
  players: (PlayerSummary | undefined)[];
  team: number;
}) {
  if (players.length === 0) {
    return <></>;
  }

  return (
    <>
      {injectBetween(
        players.map((player) => {
          return (
            <PlayerName key={player?.user_id} player={player} team={team} />
          );
        }),
        (index) => {
          return <span key={index}>&nbsp;+&nbsp;</span>;
        }
      )}
    </>
  );
}

function KillHighlightBox(highlight: KillHighlight) {
  const { classes } = useStyles({ justifyContent: "right" });

  const { killer, assister, victim } = highlight;

  // Special case for kill messages with text instead of a kill icon
  if (highlight.kill_icon === "#fall") {
    return (
      <div className={classes.root}>
        <PlayerName player={victim} />
        &nbsp;fell to a clumsy, painful death
      </div>
    );
  } else if (highlight.kill_icon === "#suicide") {
    return (
      <div className={classes.root}>
        <PlayerName player={victim} />
        &nbsp;bid farewell, cruel world!
      </div>
    );
  } else if (highlight.kill_icon === "#assisted_suicide") {
    return (
      <div className={classes.root}>
        <PlayerName player={killer} />
        {assister !== null && (
          <>
            &nbsp;+&nbsp;
            <PlayerName player={assister} />
          </>
        )}
        &nbsp;
        <b>finished off</b>
        &nbsp;
        <PlayerName player={victim} />
      </div>
    );
  } else {
    return (
      <div className={classes.root}>
        {killer !== null &&
          killer.user_id !== victim.user_id &&
          killer.team !== "other" && <PlayerName player={killer} />}
        {assister !== null && (
          <>
            &nbsp;+&nbsp;
            <PlayerName player={assister} />
          </>
        )}
        &nbsp;
        <KillstreakIcon streak={highlight.streak} />
        <KillIcon killIcon={highlight.kill_icon} />
        &nbsp;
        <PlayerName player={victim} />
      </div>
    );
  }
}

function KillStreakHighlightBox(highlight: KillStreakHighlight) {
  const { classes } = useStyles({ justifyContent: "center" });
  const { player, streak } = highlight;
  let message;
  switch (streak) {
    case 5:
      message = "is on a Killing Spree!";
      break;
    case 10:
      message = "is Unstoppable!";
      break;
    case 15:
      message = "is on a Rampage!";
      break;
    case 20:
      message = "is GOD-like!";
      break;
    default:
      if (streak > 0 && streak % 5 === 0) {
        // Multiple of 5 and greater than 20, so it's a continuation of a godlike streak
        message = "is still GOD-like!";
      } else {
        // Bad reporting? Fall back to reasonable message
        message = "is collecting frags!";
      }
      break;
  }

  return (
    <div className={classes.root}>
      <span>
        <PlayerName player={player} /> {message}
      </span>
      <KillstreakIcon streak={streak} />
    </div>
  );
}

function KillStreakEndedHighlightBox(highlight: KillStreakEndedHighlight) {
  const { classes } = useStyles({ justifyContent: "center" });
  const { killer, victim, streak } = highlight;

  let message;
  if (killer.user_id === victim.user_id) {
    message = (
      <span>
        <PlayerName player={killer} /> ended their own killstreak
      </span>
    );
  } else {
    message = (
      <span>
        <PlayerName player={killer} /> ended <PlayerName player={victim} />
        &apos;s killstreak
      </span>
    );
  }

  return (
    <div className={classes.root}>
      <span>{message}</span>
      <KillstreakIcon streak={streak} />
    </div>
  );
}

function ChatMessageHighlightBox(highlight: ChatMessageHighlight) {
  const { classes } = useStyles({ justifyContent: "left" });
  return (
    <div className={classes.root}>
      <PlayerName player={highlight.sender} />
      :&nbsp;
      {highlight.text}
    </div>
  );
}

function AirshotHighlightBox(highlight: AirshotHighlight) {
  const { classes } = useStyles({ justifyContent: "center" });
  const attackerName = highlight.attacker.name;
  const victimName = highlight.victim.name;
  return (
    <div className={classes.root}>
      AIRSHOT: {attackerName} airshot {victimName}
    </div>
  );
}

function CrossbowAirshotHighlightBox(highlight: CrossbowAirshotHighlight) {
  const { classes } = useStyles({ justifyContent: "center" });
  const healerName = highlight.healer.name;
  const targetName = highlight.target.name;
  return (
    <div className={classes.root}>
      AIRSHOT: {healerName} airshot {targetName}
    </div>
  );
}

function PointCapturedHighlightBox(
  highlight: PointCapturedHighlight,
  playerMap: Map<UserId, PlayerSummary>
) {
  const { classes } = useStyles({ justifyContent: "right" });

  const cappers = highlight.cappers.map((capper) => playerMap.get(capper));

  let icon;

  // For some reason the two capture icons are slightly
  // misaligned: The red variant has more empty pixels
  // on the right side of the icon.
  // Also, the colors of the icons come straight from the game
  // files and thus do not match the rest of the app's color
  // scheme.
  // TODO fix that.
  if (highlight.capturing_team === 2) {
    icon = "redcapture";
  } else if (highlight.capturing_team === 3) {
    icon = "bluecapture";
  }

  const translationLookup = highlight.point_name.substring(1); // substring(1) to remove the leading "#" character
  const pointName = CapturePoints[translationLookup as keyof typeof CapturePoints] ?? highlight.point_name;

  return (
    <div className={classes.root}>
      <PlayerNames players={cappers} team={highlight.capturing_team} />
      &nbsp;
      {icon !== undefined && <KillIcon killIcon={icon} />}
      captured {pointName}
    </div>
  );
}

function RoundStalemateHighlightBox() {
  const { classes } = useStyles({ justifyContent: "center" });
  return <div className={classes.root}>Round ended in a stalemate</div>;
}

function RoundStartHighlightBox() {
  const { classes } = useStyles({ justifyContent: "center" });
  return <div className={classes.root}>New round started</div>;
}

function RoundWinHighlightBox(highlight: RoundWinHighlight) {
  const { classes } = useStyles({ justifyContent: "center" });
  const team_number = highlight.winner;
  const teamName = TEAM_NAMES[team_number] ?? TEAM_NAMES[0];
  return <div className={classes.root}>{teamName} won the round</div>;
}

function PlayerConnectedHighlightBox(
  highlight: PlayerConnectedHighlight,
  playerMap: Map<UserId, PlayerSummary>
) {
  const { classes } = useStyles({ justifyContent: "left" });
  const playerName = playerMap.get(highlight.user_id)?.name ?? "<unknown>";

  return <div className={classes.root}>{playerName} has joined the game</div>;
}

function PlayerDisconnectedHighlightBox(
  highlight: PlayerDisconnectedHighlight,
  playerMap: Map<UserId, PlayerSummary>
) {
  const { classes } = useStyles({ justifyContent: "left" });
  const playerName = playerMap.get(highlight.user_id)?.name ?? "<unknown>";
  let reason = highlight.reason;
  if (reason === "#TF_MM_Generic_Kicked") {
    reason = "Removed from match by system";
  } else if (reason === "#TF_Idle_kicked") {
    reason = "Kicked due to inactivity";
  }
  return (
    <div className={classes.root}>
      {playerName} left the game ({reason})
    </div>
  );
}

function PauseHighlightBox() {
  const { classes } = useStyles({ justifyContent: "center" });
  return <div className={classes.root}>Game paused.</div>;
}

function UnpauseHighlightBox() {
  const { classes } = useStyles({ justifyContent: "center" });
  return <div className={classes.root}>Game resumed.</div>;
}

export default function HighlightBox({ event, playerMap }: HighlightProps) {
  if (event.t === "Kill") {
    return KillHighlightBox(event.c);
  } else if (event.t === "KillStreak") {
    return KillStreakHighlightBox(event.c);
  } else if (event.t === "KillStreakEnded") {
    return KillStreakEndedHighlightBox(event.c);
  } else if (event.t === "ChatMessage") {
    return ChatMessageHighlightBox(event.c);
  } else if (event.t === "Airshot") {
    return AirshotHighlightBox(event.c);
  } else if (event.t === "CrossbowAirshot") {
    return CrossbowAirshotHighlightBox(event.c);
  } else if (event.t === "PointCaptured") {
    return PointCapturedHighlightBox(event.c, playerMap);
  } else if (event.t === "RoundStalemate") {
    return RoundStalemateHighlightBox();
  } else if (event.t === "RoundStart") {
    return RoundStartHighlightBox();
  } else if (event.t === "RoundWin") {
    return RoundWinHighlightBox(event.c);
  } else if (event.t === "PlayerConnected") {
    return PlayerConnectedHighlightBox(event.c, playerMap);
  } else if (event.t === "PlayerDisconnected") {
    return PlayerDisconnectedHighlightBox(event.c, playerMap);
  } else if (event.t === "Pause") {
    return PauseHighlightBox();
  } else if (event.t === "Unpause") {
    return UnpauseHighlightBox();
  } else {
    console.error("unknown highlight:", event);
    return null;
  }
}
