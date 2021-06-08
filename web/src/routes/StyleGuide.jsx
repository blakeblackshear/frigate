import { h } from 'preact';
import ArrowDropdown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Heading from '../components/Heading';
import Select from '../components/Select';
import Switch from '../components/Switch';
import TextField from '../components/TextField';
import { useCallback, useState } from 'preact/hooks';

export default function StyleGuide() {
  const [switches, setSwitches] = useState({ 0: false, 1: true, 2: false, 3: false });
  const [showDialog, setShowDialog] = useState(false);

  const handleSwitch = useCallback(
    (id, checked) => {
      setSwitches({ ...switches, [id]: checked });
    },
    [switches]
  );

  const handleDismissDialog = () => {
    setShowDialog(false);
  };

  return (
    <div>
      <Heading size="md">Button</Heading>
      <div className="flex space-x-4 mb-4">
        <Button>Default</Button>
        <Button color="red">Danger</Button>
        <Button color="green">Save</Button>
        <Button color="gray">Gray</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="flex space-x-4 mb-4">
        <Button type="text">Default</Button>
        <Button color="red" type="text">
          Danger
        </Button>
        <Button color="green" type="text">
          Save
        </Button>
        <Button color="gray" type="text">
          Gray
        </Button>
        <Button disabled type="text">
          Disabled
        </Button>
      </div>
      <div className="flex space-x-4 mb-4">
        <Button type="outlined">Default</Button>
        <Button color="red" type="outlined">
          Danger
        </Button>
        <Button color="green" type="outlined">
          Save
        </Button>
        <Button color="gray" type="outlined">
          Gray
        </Button>
        <Button disabled type="outlined">
          Disabled
        </Button>
      </div>

      <Heading size="md">Dialog</Heading>
      <Button
        onClick={() => {
          setShowDialog(true);
        }}
      >
        Show Dialog
      </Button>
      {showDialog ? (
        <Dialog
          onDismiss={handleDismissDialog}
          title="This is a dialog"
          text="Would you like to see more?"
          actions={[
            { text: 'Yes', color: 'red', onClick: handleDismissDialog },
            { text: 'No', onClick: handleDismissDialog },
          ]}
        />
      ) : null}

      <Heading size="md">Switch</Heading>
      <div className="flex-col space-y-4 max-w-4xl">
        <Switch label="Disabled, off" labelPosition="after" />
        <Switch label="Disabled, on" labelPosition="after" checked />
        <Switch
          label="Enabled, (off initial)"
          labelPosition="after"
          checked={switches[0]}
          id={0}
          onChange={handleSwitch}
        />
        <Switch
          label="Enabled, (on initial)"
          labelPosition="after"
          checked={switches[1]}
          id={1}
          onChange={handleSwitch}
        />

        <Switch checked={switches[2]} id={2} label="Label before" onChange={handleSwitch} />
        <Switch checked={switches[3]} id={3} label="Label after" labelPosition="after" onChange={handleSwitch} />
      </div>

      <Heading size="md">Select</Heading>
      <div className="flex space-x-4 mb-4 max-w-4xl">
        <Select label="Basic select box" options={['All', 'None', 'Other']} selected="None" />
      </div>

      <Heading size="md">TextField</Heading>
      <div className="flex-col space-y-4 max-w-4xl">
        <TextField label="Default text field" />
        <TextField label="Pre-filled" value="This is my pre-filled value" />
        <TextField label="With help" helpText="This is some help text" />
        <TextField label="Leading icon" leadingIcon={ArrowDropdown} />
        <TextField label="Trailing icon" trailingIcon={ArrowDropup} />
      </div>
    </div>
  );
}
