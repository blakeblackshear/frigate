import { h } from 'preact';
import ArrowDropdown from './icons/ArrowDropdown';
import ArrowDropup from './icons/ArrowDropup';
import Card from './components/Card';
import Button from './components/Button';
import Heading from './components/Heading';
import Select from './components/Select';
import Switch from './components/Switch';
import TextField from './components/TextField';
import { useCallback, useState } from 'preact/hooks';

export default function StyleGuide() {
  const [switches, setSwitches] = useState({ 0: false, 1: true });

  const handleSwitch = useCallback(
    (id, checked) => {
      setSwitches({ ...switches, [id]: checked });
    },
    [switches]
  );

  return (
    <div>
      <Heading size="md">Button</Heading>
      <div class="flex space-x-4 mb-4">
        <Button>Default</Button>
        <Button color="red">Danger</Button>
        <Button color="green">Save</Button>
        <Button disabled>Disabled</Button>
      </div>

      <Heading size="md">Switch</Heading>
      <div class="flex">
        <div>
          <p>Disabled, off</p>
          <Switch />
        </div>
        <div>
          <p>Disabled, on</p>
          <Switch checked />
        </div>
        <div>
          <p>Enabled, (off initial)</p>
          <Switch checked={switches[0]} id={0} onChange={handleSwitch} label="Default" />
        </div>
        <div>
          <p>Enabled, (on initial)</p>
          <Switch checked={switches[1]} id={1} onChange={handleSwitch} label="Default" />
        </div>
      </div>

      <Heading size="md">Select</Heading>
      <div class="flex space-x-4 mb-4 max-w-4xl">
        <Select label="Basic select box" options={['All', 'None', 'Other']} selected="None" />
      </div>

      <Heading size="md">TextField</Heading>
      <div class="flex-col space-y-4 max-w-4xl">
        <TextField label="Default text field" />
        <TextField label="Pre-filled" value="This is my pre-filled value" />
        <TextField label="With help" helpText="This is some help text" />
        <TextField label="Leading icon" leadingIcon={ArrowDropdown} />
        <TextField label="Trailing icon" trailingIcon={ArrowDropup} />
      </div>
    </div>
  );
}
