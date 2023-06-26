import { useMemo, useRef, useState } from "react";

import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import { ScrollArea, Text } from "@mantine/core";

import { GameSummary, UserId, PlayerSummary, Highlight, HighlightPlayerSnapshot } from "../../demo";
import HighlightBox from "./HighlightBox";
import TimelineFilters, { Filters } from "./TimelineFilters";

export type TimelineProps = {
  gameSummary: GameSummary;
};

function samePlayer(
  playerId: number,
  player: PlayerSummary | HighlightPlayerSnapshot | null
): boolean {
  return playerId === player?.user_id;
}

function doesHighlightIncludePlayer(
  highlight: Highlight,
  playerId: number
): boolean {
  switch (highlight.t) {
    case "Airshot":
      return (
        samePlayer(playerId, highlight.c.victim) ||
        samePlayer(playerId, highlight.c.attacker)
      );
    case "ChatMessage":
      return samePlayer(playerId, highlight.c.sender);
    case "CrossbowAirshot":
      return (
        samePlayer(playerId, highlight.c.healer) ||
        samePlayer(playerId, highlight.c.target)
      );
    case "Kill":
      return (
        samePlayer(playerId, highlight.c.killer) ||
        samePlayer(playerId, highlight.c.assister) ||
        samePlayer(playerId, highlight.c.victim)
      );
    case "KillStreak":
      return samePlayer(playerId, highlight.c.player);
    case "KillStreakEnded":
      return (
        samePlayer(playerId, highlight.c.killer) ||
        samePlayer(playerId, highlight.c.victim)
      );
    case "PlayerConnected":
      return playerId === highlight.c.user_id;
    case "PlayerDisconnected":
      return playerId === highlight.c.user_id;
    case "PointCaptured":
      return highlight.c.cappers.includes(playerId);
    default:
      return true;
  }
}

export default function HighlightsList({ gameSummary }: TimelineProps) {
  const listRef = useRef<FixedSizeList>(null);
  const [highlights, setHighlights] = useState(gameSummary.highlights);

  const playerMap = useMemo(() => {
    const result = new Map<UserId, PlayerSummary>();
    gameSummary.players.forEach((player) => {
      result.set(player.user_id, player);
    });
    return result;
  }, [gameSummary.players]);

  const recomputeHighlights = (filters: Filters) => {
    let highlights = gameSummary.highlights;
    if (filters.playerIds.length > 0) {
      highlights = highlights.filter(h => filters.playerIds.find(p => doesHighlightIncludePlayer(h.event, Number.parseInt(p, 10))));
    }
    if (filters.chatSearch !== "") {
      // Search chat messages for matches (case-insensitive) for player names or text content
      const regex = new RegExp(filters.chatSearch, "i");
      highlights = highlights.filter(h => h.event.t !== "ChatMessage" || regex.test(h.event.c.sender.name) || regex.test(h.event.c.text));
    }
    if (!filters.visibleKillfeed) {
      highlights = highlights.filter(h => h.event.t !== "Kill");
    }
    if (!filters.visibleCaptures) {
      highlights = highlights.filter(h => h.event.t !== "PointCaptured");
    }
    if (!filters.visibleChat) {
      highlights = highlights.filter(h => h.event.t !== "ChatMessage");
    }
    if (!filters.visibleConnectionMessages) {
      highlights = highlights.filter(h => !(h.event.t === "PlayerConnected" || h.event.t === "PlayerDisconnected"));
    }
    if (!filters.visibleKillstreaks) {
      highlights = highlights.filter(h => !(h.event.t === "KillStreak" || h.event.t === "KillStreakEnded"));
    }
    if (!filters.visibleRounds) {
      highlights = highlights.filter(h => !(h.event.t === "RoundStart" || h.event.t === "RoundWin" || h.event.t === "RoundStalemate"));
    }
    if (!filters.visibleAirshots) {
      highlights = highlights.filter(h => !(h.event.t === "Airshot" || h.event.t === "CrossbowAirshot"));
    }

    setHighlights(highlights);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", margin: "auto" }}>
      <TimelineFilters gameSummary={gameSummary} onChange={recomputeHighlights}/>
      <div style={{ height: "100%" }}>
        <AutoSizer>
          {({ height, width }) => (
            <ScrollArea
              style={{ width, height }}
              onScrollPositionChange={({ y }) => listRef.current?.scrollTo(y)}
            >
              <FixedSizeList
                height={height}
                width={width}
                style={{ overflow: "visible" }}
                itemCount={highlights.length}
                itemSize={40}
                ref={listRef}
              >
                {({ style, index }) => {
                  const { event, tick } = highlights[index];
                  return (
                    <div
                      style={{ ...style, display: "flex", alignItems: "center" }}
                    >
                      <Text
                        color="dimmed"
                        size="sm"
                        style={{
                          width: "7ch",
                          fontFamily: "monospace",
                          textAlign: "right",
                          paddingRight: 8,
                        }}
                      >
                        {tick}
                      </Text>
                      <HighlightBox event={event} playerMap={playerMap} />
                    </div>
                  );
                }}
              </FixedSizeList>
            </ScrollArea>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}
