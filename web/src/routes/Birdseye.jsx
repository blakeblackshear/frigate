import { h } from 'preact';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';

export default function Birdseye() {
  return (
    <div className='space-y-4 p-2 px-4'>
      <Heading size='2xl'>Birdseye</Heading>
      <div>
        <JSMpegPlayer camera='birdseye' />
      </div>
    </div>
  );
}
