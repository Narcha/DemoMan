import { open as openFilePicker } from "@tauri-apps/api/dialog";

import { Button } from "@mantine/core";

type PathPickerProps = Omit<React.ComponentProps<"input">, "value"> & {
  value: string;
  setValue(value: string): void;
};

export default function PathPicker({
  value,
  setValue,
  ...otherProps
}: PathPickerProps) {
  return (
    <div style={{ display: "flex", gap: "var(--mantine-spacing-sm)" }}>
      <input
        placeholder="Select path"
        style={{ flexGrow: 1 }}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        {...otherProps}
      ></input>
      <Button
        variant="default"
        onClick={() =>
          openFilePicker({
            directory: true,
            title: "Select Demo Directory",
            defaultPath: value,
          })
            .then((value) => {
              if (value !== null && value !== "") {
                // Don't set the path if the user cancelled the dialog
                setValue(value as string);
              }
              return;
            })
            .catch((error) => console.error(error))
        }
      >
        Browse...
      </Button>
    </div>
  );
}
