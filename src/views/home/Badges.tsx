import { Group, Badge, Text } from "@mantine/core";
import { IconTags } from "@tabler/icons-react";


export default function Badges({ items, max }: { items: string[]; max: number }) {
  if (items.length === 0) {
    return null;
  }
  const overflowAmount = items.length - max;
  const shownItems = items.slice(0, max);
  return (
    <div style={{ display: "flex" }}>
      <Group spacing={4}>
        <IconTags color="gray" />
        {shownItems.map((item) => (
          <Badge
            key={item}
            variant="filled"
            size="sm"
            style={{ maxWidth: "100px" }}
          >
            {item}
          </Badge>
        ))}
        {overflowAmount > 0 && (
          <Text size="sm" color="dimmed">
            +{overflowAmount} more
          </Text>
        )}
      </Group>
    </div>
  );
}