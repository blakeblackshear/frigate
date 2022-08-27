import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { useMqtt } from '../api/mqtt';
import useSWR from 'swr';
import { Table, Tbody, Thead, Tr, Th, Td } from '../components/Table';
import { useCallback } from 'preact/hooks';
import { useTranslation } from 'react-i18next';

const emptyObject = Object.freeze({});

export default function Debug() {
  const { t } = useTranslation();
  const { data: config } = useSWR('config');

  const {
    value: { payload: stats },
  } = useMqtt('stats');
  const { data: initialStats } = useSWR('stats');

  const { detectors, service = {}, detection_fps: _, ...cameras } = stats || initialStats || emptyObject;

  const detectorNames = Object.keys(detectors || emptyObject);
  const detectorDataKeys = Object.keys(detectors ? detectors[detectorNames[0]] : emptyObject);
  const cameraNames = Object.keys(cameras || emptyObject);
  const cameraDataKeys = Object.keys(cameras[cameraNames[0]] || emptyObject);

  const handleCopyConfig = useCallback(() => {
    async function copy() {
      await window.navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    }
    copy();
  }, [config]);

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>
        {t('debug')} <span className="text-sm">{service.version}</span>
      </Heading>

      {!detectors ? (
        <div>
          <ActivityIndicator />
        </div>
      ) : (
        <Fragment>
          <div data-testid="detectors" className="min-w-0 overflow-auto">
            <Table className="w-full">
              <Thead>
                <Tr>
                  <Th>{t('_detector')}</Th>
                  {detectorDataKeys.map((name) => (
                    <Th key={name}>{name.replace('_', ' ')}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {detectorNames.map((detector, i) => (
                  <Tr key={i} index={i}>
                    <Td>{detector}</Td>
                    {detectorDataKeys.map((name) => (
                      <Td key={`${name}-${detector}`}>{detectors[detector][name]}</Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>

          <div data-testid="cameras" className="min-w-0 overflow-auto">
            <Table className="w-full">
              <Thead>
                <Tr>
                  <Th>{t('_camera')}</Th>
                  {cameraDataKeys.map((name) => (
                    <Th key={name}>{name.replace('_', ' ')}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {cameraNames.map((camera, i) => (
                  <Tr key={i} index={i}>
                    <Td>
                      <Link href={`/cameras/${camera}`}>{camera.replaceAll('_', ' ')}</Link>
                    </Td>
                    {cameraDataKeys.map((name) => (
                      <Td key={`${name}-${camera}`}>{cameras[camera][name]}</Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>

          <p>{t('debug_update_interval').replace("{interval}", config.mqtt.stats_interval)}</p>
        </Fragment>
      )}

      <div className="relative">
        <Heading size="sm">{t('config')}</Heading>
        <Button className="absolute top-8 right-4" onClick={handleCopyConfig}>
          {t('copy_clipboard')}
        </Button>
        <pre className="overflow-auto font-mono text-gray-900 dark:text-gray-100 rounded bg-gray-100 dark:bg-gray-800 p-2 max-h-96">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  );
}
