import { h } from 'preact';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import { useTranslation } from 'react-i18next';

export default function Birdseye() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading size="2xl">{t('birdseye')}</Heading>
      <div>
        <JSMpegPlayer camera="birdseye" />
      </div>
    </div>
  );
}
