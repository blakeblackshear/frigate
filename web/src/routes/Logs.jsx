import { h } from 'preact';
import Heading from '../components/Heading';
import { useEffect } from 'preact/hooks';
import { tail } from 'tail';

const Tail = tail.Tail;

export default function Logs() {
  const stdout = new Tail("/dev/stdout");

  useEffect(() => {
    stdout.on("line", (data) => {
      console.log(data);
    });

    return () => {
      stdout.unwatch();
    };
  });

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Logs</Heading>
    </div>
  );
}
