import { h } from 'preact';
import { ApiHost, Config } from '../context';
import { useCallback, useEffect, useContext, useState } from 'preact/hooks';

export default function CameraImage({ camera, searchParams = '', imageRef }) {
  const config = useContext(Config);
  const apiHost = useContext(ApiHost);
  const { name, width, height } = config.cameras[camera];

  const aspectRatio = width / height;
  const innerWidth = parseInt(window.innerWidth, 10);

  const responsiveWidths = [640, 768, 1024, 1280];
  if (innerWidth > responsiveWidths[responsiveWidths.length - 1]) {
    responsiveWidths.push(innerWidth);
  }

  const src = `${apiHost}/api/${camera}/latest.jpg`;
  const { srcset, sizes } = responsiveWidths.reduce(
    (memo, w, i) => {
      memo.srcset.push(`${src}?h=${Math.ceil(w / aspectRatio)}&${searchParams} ${w}w`);
      memo.sizes.push(`(max-width: ${w}) ${Math.ceil((w / innerWidth) * 100)}vw`);
      return memo;
    },
    { srcset: [], sizes: [] }
  );

  return (
    <img
      className="w-full"
      srcset={srcset.join(', ')}
      sizes={sizes.join(', ')}
      src={`${srcset[srcset.length - 1]}`}
      alt={name}
      ref={imageRef}
    />
  );
}
