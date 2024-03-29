import React from "react";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import SmallDialog from "./SmallDialog";

type RenameDialogProps = {
  onClose: () => void;
  onConfirm: (newName: string) => void;
  ref: React.RefObject<RenameDialog>;
};

type RenameDialogState = {
  newName: string | null;
  newNameValid: boolean;
  open: boolean;
};

export default class RenameDialog extends React.Component<
  RenameDialogProps,
  RenameDialogState
> {
  constructor(props: RenameDialogProps) {
    super(props);
    this.state = { newName: null, newNameValid: true, open: false };
  }

  close = () => {
    this.setState({
      open: false,
    });
  };

  open = (demoName: string) => {
    this.setState({
      newName: demoName,
      open: true,
    });
  };

  validateNewName = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    // Only allow filenames with legal characters and reasonable length
    if (/^[a-zA-Z0-9\-_ [\]().]{1,50}$/.test(e.target.value)) {
      this.setState({ newName: e.target.value, newNameValid: true });
    } else {
      this.setState({ newNameValid: false });
    }
  };

  render() {
    const { onClose, onConfirm } = this.props;
    const { open, newName, newNameValid } = this.state;

    return (
      <SmallDialog
        title="Rename"
        open={open}
        onClose={onClose}
        actions={
          <>
            <Button variant="contained" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (newName !== null) {
                  onConfirm(newName);
                }
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <TextField
          required
          label="New name"
          InputProps={{
            endAdornment: <InputAdornment position="end">.dem</InputAdornment>,
          }}
          variant="outlined"
          value={newName}
          error={!newNameValid}
          onChange={this.validateNewName}
          fullWidth
        />
      </SmallDialog>
    );
  }
}
