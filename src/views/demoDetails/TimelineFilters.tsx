import { useState } from "react";
import { MultiSelect, Switch, TextInput } from "@mantine/core";
import { useToggle } from "@mantine/hooks";
import { GameSummary, PlayerSummary } from "../../demo";

export type Filters = {
  playerIds: string[],
  chatSearch: string,
  visibleKillfeed: boolean,
  visibleChat: boolean,
  visibleConnectionMessages: boolean,
  visibleKillstreaks: boolean,
  visibleRounds: boolean,
};

export type TimelineFiltersProps = {
  gameSummary: GameSummary;
  onChange: (values: Filters) => void;
};

type SelectItem = {
  label: string;
  value: string;
};

function playerToSelectItem(player: PlayerSummary): SelectItem {
  return {
    label: player.name,
    value: player.user_id.toString(10),
  };
}

export default function TimelineFilters({
  gameSummary,
  onChange,
}: TimelineFiltersProps) {
  const [filters, setFilters] = useState({
    playerIds: [],
    chatSearch: "",
    visibleKillfeed: true,
    visibleChat: true,
    visibleConnectionMessages: true,
    visibleKillstreaks: true,
    visibleRounds: true,
  } as Filters);

  return (
    <div style={{ display: "grid" }}>
      <Switch label={"Show Killfeed"} defaultChecked={true} onChange={(event) =>{
        filters.visibleKillfeed = event.target.checked;
        setFilters(filters);
        onChange(filters);
      }}/>
      <Switch label={"Show Chat"} defaultChecked={true} onChange={(event) => {
        filters.visibleChat = event.target.checked;
        setFilters(filters);
        onChange(filters);
      }}/>
      <Switch label={"Show Connection Messages"} defaultChecked={true} onChange={(event) => {
        filters.visibleConnectionMessages = event.target.checked;
        setFilters(filters);
        onChange(filters);
      }} />
      <Switch label={"Show Killstreaks"} defaultChecked={true} onChange={(event) => {
        filters.visibleKillstreaks = event.target.checked;
        setFilters(filters);
        onChange(filters);
      }} />
      <Switch label={"Show Rounds"} defaultChecked={true} onChange={(event) => {
        filters.visibleRounds = event.target.checked;
        setFilters(filters);
        onChange(filters);
      }} />
      <TextInput
        label={"Search Chat"}
        placeholder={"Chat search.  Case insensitive; regex supported"}
        onChange={(event) => {
        filters.chatSearch = event.target.value;
        setFilters(filters);
        onChange(filters);
      }} />
      <MultiSelect
        label={"Filter players"}
        data={gameSummary.players.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(playerToSelectItem)}
        placeholder={"Select one or more players"}
        onChange={(values) => {
          filters.playerIds = values;
          setFilters(filters);
          onChange(filters);
        }}
        searchable
      />
    </div>
  );
}
