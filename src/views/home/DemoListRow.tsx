import { memo } from "react";

import {
  ActionIcon,
  createStyles,
  getStylesRef,
  Group,
  HoverCard,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  Icon as IconType,
  IconCalendarEvent,
  IconDeviceTv,
  IconPencil,
  IconTrash,
  IconUser,
  IconPlayerPlayFilled,
  IconBookmarks,
  IconBookmark,
} from "@tabler/icons-react";
import { areEqual } from "react-window";

import { Demo, isStvDemo } from "../../demo";
import { IconKillstreak } from "../../components/icons";
import MapBox from "./MapBox";
import Badges from "./Badges";

type DemoListRowProps = {
  demo: Demo;
  selected: boolean;
  selectionMode: boolean;
  onClick(): void;
};

function HoverMenuItem({
  Icon,
  label,
  onClick,
}: {
  Icon: IconType;
  label: string;
  onClick(): void;
}) {
  return (
    <Tooltip label={label}>
      <ActionIcon
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          onClick();
          event.stopPropagation();
        }}
      >
        <Icon size={18} />
      </ActionIcon>
    </Tooltip>
  );
}

// TODO fix the background color when hovering,
// maybe add a hover effect to the thumbnail as well
const useStyles = createStyles(
  (
    theme,
    {
      selectionMode: _,
      selected,
    }: { selectionMode: boolean; selected: boolean }
  ) => ({
    paper: {
      height: "120px",
      cursor: "pointer",
      display: "flex",
      alignItems: "stretch",
      // Needed so the corners of the child elements respect the border radius
      overflow: "hidden",
      "&:hover": {
        backgroundColor: selected
          ? theme.fn.variant({ variant: "light", color: theme.primaryColor })
              .background
          : theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[1],
        [`& .${getStylesRef("menu")}`]: {
          display: "flex",
        },
      },
      transition: "background-color 150ms ease, border-color 150ms ease",
      boxShadow: selected
        ? `0px 0px 0px 2px ${
            theme.fn.variant({ variant: "outline", color: theme.primaryColor })
              .border
          }`
        : undefined,
      borderRadius: theme.radius.md,
      backgroundColor: selected
        ? theme.fn.variant({ variant: "light", color: theme.primaryColor })
            .background
        : theme.colorScheme === "dark"
        ? theme.colors.dark[7]
        : theme.white,
    },
    content: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "start",
      alignItems: "start",
      padding: "8px",
      flexGrow: 1,
    },
    menu: {
      ref: getStylesRef("menu"),
      display: "none", // Changes to "flex" when hovered
      alignItems: "center",
      position: "absolute",
      top: -16,
      right: 16,
      height: 32,
    },
  })
);

function DemoListRow({
  demo,
  selected,
  selectionMode,
  onClick,
}: DemoListRowProps) {
  const { classes } = useStyles({ selectionMode, selected });
  const birthtime = new Date(demo.birthtime * 1000);
  return (
    <Paper className={classes.paper} radius="md" shadow="xl" onClick={onClick}>
      <MapBox mapName={demo.mapName} />
      <div className={classes.content}>
        <Group spacing="xs">
          <Title order={3} inline>
            {demo.name}
          </Title>
          {isStvDemo(demo) && <IconDeviceTv />}
        </Group>
        <Badges items={demo.tags} max={3} />
        {!isStvDemo(demo) && (
          <Group spacing={4}>
            <IconUser color="grey" />
            <Text color="dimmed">{demo.clientName}</Text>
          </Group>
        )}
        <Group spacing={4}>
          <IconCalendarEvent color="gray" />
          <Text color="dimmed">{birthtime.toLocaleString()}</Text>
        </Group>
        {demo.events.length !== 0 && (
          <HoverCard
            withArrow
            position="right-end"
            styles={(theme) => ({
              dropdown: {
                padding: 0,
                paddingLeft: theme.spacing.xs,
              },
            })}
          >
            <HoverCard.Target>
              <Group spacing={4}>
                <IconBookmarks color="gray" />
                <Text color="dimmed">{demo.events.length} Bookmarks</Text>
              </Group>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <ScrollArea.Autosize
                mah="10rem"
                offsetScrollbars
                type="auto"
                styles={(theme) => ({
                  viewport: {
                    paddingTop: theme.spacing.xs,
                    paddingBottom: theme.spacing.xs,
                  },
                })}
              >
                <Stack align="stretch" spacing={0}>
                  {demo.events.map((event, idx) => (
                    <Group key={idx} align="center" position="left" spacing={0}>
                      {event.name === "Bookmark" ? (
                        <IconBookmark />
                      ) : (
                        <IconKillstreak />
                      )}
                      <Text
                        sx={(theme) => ({
                          flexGrow: 1,
                          marginRight: theme.spacing.xs,
                        })}
                      >
                        {event.value}
                      </Text>
                      <Text color="dimmed" size="xs">
                        {event.tick}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </HoverCard.Dropdown>
          </HoverCard>
        )}
      </div>
      <Paper shadow="xl" withBorder className={classes.menu}>
        <HoverMenuItem
          Icon={IconTrash}
          label="Delete"
          onClick={() => {
            console.log("delete");
          }}
        />
        <HoverMenuItem
          Icon={IconPencil}
          label="Rename"
          onClick={() => {
            console.log("rename");
          }}
        />
        <HoverMenuItem
          Icon={IconPlayerPlayFilled}
          label="Play"
          onClick={() => {
            console.log("play");
          }}
        />
      </Paper>
    </Paper>
  );
}

export default memo(DemoListRow, areEqual);
