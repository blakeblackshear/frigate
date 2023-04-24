import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { useWs } from '../api/ws';
import useSWR from 'swr';
import axios from 'axios';
import { Table, Tbody, Thead, Tr, Th, Td } from '../components/Table';
import { useState } from 'preact/hooks';
import Dialog from '../components/Dialog';
import TimeAgo from '../components/TimeAgo';
import copy from 'copy-to-clipboard';

const emptyObject = Object.freeze({});

export default function System() {
  const [state, setState] = useState({ showFfprobe: false, ffprobe: '' });
  const { data: config } = useSWR('config');

  const {
    value: { payload: stats },
  } = useWs('stats');
  const { data: initialStats } = useSWR('stats');

  const {
    cpu_usages,
    gpu_usages,
    detectors,
    service = {},
    detection_fps: _,
    ...cameras
  } = stats || initialStats || emptyObject;

  const detectorNames = Object.keys(detectors || emptyObject);
  const gpuNames = Object.keys(gpu_usages || emptyObject);
  const cameraNames = Object.keys(cameras || emptyObject);

  const onHandleFfprobe = async (camera, e) => {
    if (e) {
      e.stopPropagation();
    }

    setState({ ...state, showFfprobe: true });
    const response = await axios.get('ffprobe', {
      params: {
        paths: `camera:${camera}`,
      },
    });

    if (response.status === 200) {
      setState({ ...state, showFfprobe: true, ffprobe: response.data });
    } else {
      setState({ ...state, showFfprobe: true, ffprobe: 'There was an error getting the ffprobe output.' });
    }
  };

  const onCopyFfprobe = async () => {
    copy(JSON.stringify(state.ffprobe).replace(/[\\\s]+/gi, ''));
    setState({ ...state, ffprobe: '', showFfprobe: false });
  };

  const onHandleVainfo = async (e) => {
    if (e) {
      e.stopPropagation();
    }

    const response = await axios.get('vainfo');

    if (response.status === 200) {
      setState({
        ...state,
        showVainfo: true,
        vainfo: response.data,
      });
    } else {
      setState({ ...state, showVainfo: true, vainfo: 'There was an error getting the vainfo output.' });
    }
  };

  const onCopyVainfo = async () => {
    copy(JSON.stringify(state.vainfo).replace(/[\\\s]+/gi, ''));
    setState({ ...state, vainfo: '', showVainfo: false });
  };

  return (
    <div className="space-y-4 p-2 px-4">
      <div className="flex justify-between">
        <Heading>
          System <span className="text-sm">{service.version}</span>
        </Heading>
        {config && (
          <Link
            className="p-1 text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            href="/live/webrtc/"
          >
            go2rtc dashboard
          </Link>
        )}
      </div>

      {service.last_updated && (
        <p>
          <span>
            Last refreshed: <TimeAgo time={service.last_updated * 1000} dense />
          </span>
        </p>
      )}

      {state.showFfprobe && (
        <Dialog>
          <div className="p-4 mb-2 max-h-96 whitespace-pre-line overflow-scroll">
            <Heading size="lg">Ffprobe Output</Heading>
            {state.ffprobe != '' ? (
              <div>
                {state.ffprobe.map((stream, idx) => (
                  <div key={idx} className="mb-2 max-h-96 whitespace-pre-line">
                    <div>Stream {idx}:</div>
                    <div className="px-2">Return Code: {stream.return_code}</div>
                    <br />
                    {stream.return_code == 0 ? (
                      <div>
                        {stream.stdout.streams.map((codec, idx) => (
                          <div className="px-2" key={idx}>
                            {codec.width ? (
                              <div>
                                <div>Video:</div>
                                <br />
                                <div>Codec: {codec.codec_long_name}</div>
                                <div>
                                  Resolution: {codec.width}x{codec.height}
                                </div>
                                <div>FPS: {codec.avg_frame_rate == '0/0' ? 'Unknown' : codec.avg_frame_rate}</div>
                                <br />
                              </div>
                            ) : (
                              <div>
                                <div>Audio:</div>
                                <br />
                                <div>Codec: {codec.codec_long_name}</div>
                                <br />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2">
                        <div>Error: {stream.stderr}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <ActivityIndicator />
            )}
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            <Button className="ml-2" onClick={() => onCopyFfprobe()} type="text">
              Copy
            </Button>
            <Button
              className="ml-2"
              onClick={() => setState({ ...state, ffprobe: '', showFfprobe: false })}
              type="text"
            >
              Close
            </Button>
          </div>
        </Dialog>
      )}

      {state.showVainfo && (
        <Dialog>
          <div className="p-4 overflow-scroll whitespace-pre-line">
            <Heading size="lg">Vainfo Output</Heading>
            {state.vainfo != '' ? (
              <div className="mb-2 max-h-96 whitespace-pre-line">
                <div className="">Return Code: {state.vainfo.return_code}</div>
                <br />
                <div className="">Process {state.vainfo.return_code == 0 ? 'Output' : 'Error'}:</div>
                <br />
                <div>{state.vainfo.return_code == 0 ? state.vainfo.stdout : state.vainfo.stderr}</div>
              </div>
            ) : (
              <ActivityIndicator />
            )}
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2 whitespace-pre-wrap">
            <Button className="ml-2" onClick={() => onCopyVainfo()} type="text">
              Copy
            </Button>
            <Button className="ml-2" onClick={() => setState({ ...state, vainfo: '', showVainfo: false })} type="text">
              Close
            </Button>
          </div>
        </Dialog>
      )}

      {!detectors ? (
        <div>
          <ActivityIndicator />
        </div>
      ) : (
        <Fragment>
          <Heading size="lg">Detectors</Heading>
          <div data-testid="detectors" className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
            {detectorNames.map((detector) => (
              <div key={detector} className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow">
                <div className="text-lg flex justify-between p-4">{detector}</div>
                <div className="p-2">
                  <Table className="w-full">
                    <Thead>
                      <Tr>
                        <Th>P-ID</Th>
                        <Th>Inference Speed</Th>
                        <Th>CPU %</Th>
                        <Th>Memory %</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>{detectors[detector]['pid']}</Td>
                        <Td>{detectors[detector]['inference_speed']} ms</Td>
                        <Td>{cpu_usages[detectors[detector]['pid']]?.['cpu'] || '- '}%</Td>
                        <Td>{cpu_usages[detectors[detector]['pid']]?.['mem'] || '- '}%</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <div className="text-lg flex justify-between p-4">
            <Heading size="lg">GPUs</Heading>
            <Button onClick={(e) => onHandleVainfo(e)}>vainfo</Button>
          </div>

          {!gpu_usages ? (
            <div className="p-4">
              <Link href={'https://docs.frigate.video/configuration/hardware_acceleration'}>
                Hardware acceleration has not been setup, see the docs to setup hardware acceleration.
              </Link>
            </div>
          ) : (
            <div data-testid="gpus" className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
              {gpuNames.map((gpu) => (
                <div key={gpu} className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow">
                  <div className="text-lg flex justify-between p-4">{gpu}</div>
                  <div className="p-2">
                    {gpu_usages[gpu]['gpu'] == -1 ? (
                      <div className="p-4">
                        There was an error getting usage stats. This does not mean hardware acceleration is not working.
                        Either your GPU does not support this or Frigate does not have proper access to get statistics.
                        This is expected for the Home Assistant addon.
                      </div>
                    ) : (
                      <Table className="w-full">
                        <Thead>
                          <Tr>
                            <Th>GPU %</Th>
                            <Th>Memory %</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <Tr>
                            <Td>{gpu_usages[gpu]['gpu']}</Td>
                            <Td>{gpu_usages[gpu]['mem']}</Td>
                          </Tr>
                        </Tbody>
                      </Table>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Heading size="lg">Cameras</Heading>
          {!cameras ? (
            <ActivityIndicator />
          ) : (
            <div data-testid="cameras" className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
              {cameraNames.map((camera) => (
                <div key={camera} className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow">
                  <div className="capitalize text-lg flex justify-between p-4">
                    <Link href={`/cameras/${camera}`}>{camera.replaceAll('_', ' ')}</Link>
                    <Button onClick={(e) => onHandleFfprobe(camera, e)}>ffprobe</Button>
                  </div>
                  <div className="p-2">
                    <Table className="w-full">
                      <Thead>
                        <Tr>
                          <Th>Process</Th>
                          <Th>P-ID</Th>
                          <Th>FPS</Th>
                          <Th>CPU %</Th>
                          <Th>Memory %</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr key="ffmpeg" index="0">
                          <Td>ffmpeg</Td>
                          <Td>{cameras[camera]['ffmpeg_pid'] || '- '}</Td>
                          <Td>{cameras[camera]['camera_fps'] || '- '}</Td>
                          <Td>{cpu_usages[cameras[camera]['ffmpeg_pid']]?.['cpu'] || '- '}%</Td>
                          <Td>{cpu_usages[cameras[camera]['ffmpeg_pid']]?.['mem'] || '- '}%</Td>
                        </Tr>
                        <Tr key="capture" index="1">
                          <Td>Capture</Td>
                          <Td>{cameras[camera]['capture_pid'] || '- '}</Td>
                          <Td>{cameras[camera]['process_fps'] || '- '}</Td>
                          <Td>{cpu_usages[cameras[camera]['capture_pid']]?.['cpu'] || '- '}%</Td>
                          <Td>{cpu_usages[cameras[camera]['capture_pid']]?.['mem'] || '- '}%</Td>
                        </Tr>
                        <Tr key="detect" index="2">
                          <Td>Detect</Td>
                          <Td>{cameras[camera]['pid'] || '- '}</Td>

                          {(() => {
                            if (cameras[camera]['pid'] && cameras[camera]['detection_enabled'] == 1)
                              return (
                                <Td>
                                  {cameras[camera]['detection_fps']} ({cameras[camera]['skipped_fps']} skipped)
                                </Td>
                              );
                            else if (cameras[camera]['pid'] && cameras[camera]['detection_enabled'] == 0)
                              return <Td>disabled</Td>;

                            return <Td>- </Td>;
                          })()}

                          <Td>{cpu_usages[cameras[camera]['pid']]?.['cpu'] || '- '}%</Td>
                          <Td>{cpu_usages[cameras[camera]['pid']]?.['mem'] || '- '}%</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p>System stats update automatically every {config.mqtt.stats_interval} seconds.</p>
        </Fragment>
      )}
    </div>
  );
}
