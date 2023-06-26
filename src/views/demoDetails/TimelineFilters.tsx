import { ReactNode, useState } from "react";
import { Button, createStyles, MultiSelect, TextInput } from "@mantine/core";
import { GameSummary, PlayerSummary } from "../../demo";
import { useToggle } from "@mantine/hooks";

export type Filters = {
  playerIds: string[],
  chatSearch: string,
  visibleKillfeed: boolean,
  visibleCaptures: boolean,
  visibleChat: boolean,
  visibleConnectionMessages: boolean,
  visibleKillstreaks: boolean,
  visibleRounds: boolean,
  visibleAirshots: boolean,
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

const useStyles = createStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingBottom: 8,
  },
  buttonBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))",
    gap: 2,
  },
  toggleButtonOn: {
    // just act like a normal button
  },
  toggleButtonOff: {
    backgroundColor: theme.colors.gray[9],
    "&:hover": {
      backgroundColor: theme.colors.gray[7]
    },
    "&:pressed": {
      backgroundColor: theme.colors.gray[8],
    }
  }
}));

type ToggleButtonProps = {
  children?: ReactNode,
  onSelect: (selected: boolean) => void,
};

function ToggleButton({ children, onSelect }: ToggleButtonProps) {
  const [checked, toggle] = useToggle<boolean>([true, false]);
  const { classes } = useStyles();

  return (
    <Button
      className={ checked ? classes.toggleButtonOn : classes.toggleButtonOff }
      onClick={() => {
        // Have to negate when invoking the callback to keep consistency with the UI,
        // since the toggle will change the checked value AFTER this callback runs
        onSelect(!checked);
        toggle();
      }}
    >
      { children }
    </Button>
  );
}

export default function TimelineFilters({
  gameSummary,
  onChange,
}: TimelineFiltersProps) {
  const [filters, setFilters] = useState({
    playerIds: [],
    chatSearch: "",
    visibleKillfeed: true,
    visibleCaptures: true,
    visibleChat: true,
    visibleConnectionMessages: true,
    visibleKillstreaks: true,
    visibleRounds: true,
    visibleAirshots: true,
  } as Filters);

  const { classes } = useStyles();

  const setVisibility = function(prop: keyof Filters, visible: boolean) {
    // @ts-expect-error: this is known to be a boolean field, but the compiler can't infer that
    filters[prop] = visible;
    setFilters(filters);
    onChange(filters);
  };

  return (
    <div className={classes.root}>
      <div className={classes.buttonBar}>
        <ToggleButton onSelect={(visible) => setVisibility("visibleKillfeed", visible)}>
          Killfeed
        </ToggleButton>
        <ToggleButton onSelect={(visible) => setVisibility("visibleKillstreaks", visible)}>
          Killstreaks
        </ToggleButton>
        <ToggleButton onSelect={(visible) => setVisibility("visibleCaptures", visible)}>
          Captures
        </ToggleButton>
        <ToggleButton onSelect={(visible) => setVisibility("visibleChat", visible)}>
          Chat
        </ToggleButton>
        <ToggleButton onSelect={(visible) => setVisibility("visibleConnectionMessages", visible)}>
          Player Joins
        </ToggleButton>
        <ToggleButton onSelect={(visible) => setVisibility("visibleRounds", visible)}>
          Rounds
        </ToggleButton>
        <ToggleButton onSelect={(visible) => setVisibility("visibleAirshots", visible)}>
          Airshots
        </ToggleButton>
      </div>

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
