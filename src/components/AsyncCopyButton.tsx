import { writeText } from "@tauri-apps/api/clipboard";

import { Tooltip, ActionIcon } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useAsyncCallback } from "react-async-hook";

export type AsyncCopyButtonProps = {
  text: string;
};

export default function AsyncCopyButton({ text }: AsyncCopyButtonProps) {
  const asyncWriteText = useAsyncCallback(writeText);
  return (
    <Tooltip label="Copy to clipboard">
      <ActionIcon
        color={asyncWriteText.status == "success" ? "teal" : "gray"}
        onClick={() =>
          asyncWriteText.execute(text).then(() => {
            setTimeout(() => {
              asyncWriteText.reset();
            }, 1000);

            // eslint wants each `.then` to return something...
            return null;
          })
        }
      >
        {asyncWriteText.status == "success" ? (
          <IconCheck size={16} />
        ) : (
          <IconCopy size={16} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
