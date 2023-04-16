import { useState } from "react";

import { Alert, Center, Paper, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
} from "@tabler/icons-react";

import useStore from "../../hooks/useStore";
import { initRcon, sendCommand } from "../../api";
import { AsyncButton, AsyncCopyButton } from "../../components";

export default function RconSetup() {
  const [rconPassword, setRconPassword] = useStore("rconPassword");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (rconPassword === undefined) {
    // Set a new random password
    setRconPassword(btoa(Math.random().toString()).substring(10, 20));
    return null;
  }

  const launchFlags = `-usercon +rcon_password ${rconPassword} +ip 0.0.0.0 +hostport 27969 +net_start`;

  return (
    <Center style={{ height: "100%" }}>
      <Stack>
        <div>Add this to your launch options:</div>
        <Paper
          withBorder
          p="xs"
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: "monospace",
            gap: 8,
          }}
        >
          <Text
            style={{
              userSelect: "text",
              WebkitUserSelect: "text",
            }}
          >
            {launchFlags}
          </Text>
          <AsyncCopyButton text={launchFlags} />
        </Paper>
        <div>
          <AsyncButton
            onClick={async () => {
              try {
                await initRcon(rconPassword);
              } catch {
                setError(
                  "Connection refused. Make sure TF2 is running and has the correct launch options set."
                );
                setSuccess(false);
                return;
              }
              let response;
              try {
                response = await sendCommand("echo test");
              } catch {
                setError("RCON command failed.");
                setSuccess(false);
                return;
              }
              if (response.trim() === "test") {
                setError(null);
                setSuccess(true);
              } else {
                setError(`Unexpected RCON response: "${response}"`);
                setSuccess(false);
              }
            }}
          >
            Test connection
          </AsyncButton>
        </div>
        {error !== null && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}
        {success && (
          <Alert icon={<IconCircleCheck size={16} />} title="Success!">
            Connection established.
          </Alert>
        )}
      </Stack>
    </Center>
  );
}
