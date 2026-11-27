import { Ref, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FISHEYE_SETTINGS,
  FisheyeMount,
  FisheyeSettings,
} from "@/types/fisheye";

export type Camera360ViewerHandle = {
  /** Upload the latest decoded frame to the fisheye texture. */
  updateFrame: (image: HTMLImageElement) => void;
};

export type Camera360Source = HTMLVideoElement | HTMLCanvasElement;

type Camera360ViewerProps = {
  className?: string;
  settings?: FisheyeSettings;
  /** Outline the edge of the fisheye circle on the sphere, for calibration. */
  showEdge?: boolean;
  /**
   * Play this live source on the sphere, instead of frames from updateFrame.
   * A WebGL canvas must be created with preserveDrawingBuffer to be readable.
   */
  source?: Camera360Source | null;
  ref?: Ref<Camera360ViewerHandle>;
};

const SPHERE_RADIUS = 500;
const DEFAULT_FOV = 75;
const MIN_FOV = 30;
const MAX_FOV = 100;
const MAX_LAT = 85;
const EDGE_COLOR = 0xff3333;
const EDGE_WIDTH_PX = 3;

const vertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// In the lens frame the optical axis points down (-Y), image +x maps to +X
// and image +y (down) maps to +Z. On the sphere +Y is up and the viewer
// starts out facing +X. Each mount orients the lens frame on the sphere, the
// matrices are written row by row and map lens directions to sphere directions.
const MOUNT_ORIENTATIONS: Record<
  FisheyeMount,
  { lensToSphere: THREE.Matrix3; defaultLat: number }
> = {
  // lens looks straight down
  ceiling: {
    lensToSphere: new THREE.Matrix3().set(1, 0, 0, 0, 1, 0, 0, 0, 1),
    defaultLat: -45,
  },
  // lens looks straight up
  desktop: {
    lensToSphere: new THREE.Matrix3().set(1, 0, 0, 0, -1, 0, 0, 0, -1),
    defaultLat: 45,
  },
  // lens looks at the horizon along +X, with image down pointing down
  wall: {
    lensToSphere: new THREE.Matrix3().set(0, -1, 0, 0, 0, -1, 1, 0, 0),
    defaultLat: 0,
  },
};

// Assumes an equidistant fisheye lens. lensRotation takes sphere directions
// into the lens frame, which applies the mount orientation.
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform mat3 lensRotation;
  uniform bool hasMap;
  uniform vec2 center;
  uniform float radius;
  uniform float imageAspect;
  uniform float halfLensFov;
  uniform bool showEdge;
  uniform vec3 edgeColor;
  uniform float edgeWidth;

  varying vec3 vDir;

  void main() {
    vec3 dir = lensRotation * normalize(vDir);
    float theta = acos(clamp(-dir.y, -1.0, 1.0));

    // fwidth keeps the outline a constant width on screen at any zoom
    if (showEdge && abs(theta - halfLensFov) < 0.5 * edgeWidth * fwidth(theta)) {
      gl_FragColor = vec4(edgeColor, 1.0);
      return;
    }

    if (!hasMap || theta > halfLensFov) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    float r = (theta / halfLensFov) * radius;
    float planar = length(dir.xz);
    vec2 offset = planar > 1e-6 ? dir.xz / planar : vec2(0.0);

    // radius is relative to image height, so scale x by the aspect ratio
    vec2 imageCoord = center + vec2(offset.x * r / imageAspect, offset.y * r);

    // the circle extends past the frame, show black instead of smeared pixels
    if (any(lessThan(imageCoord, vec2(0.0))) || any(greaterThan(imageCoord, vec2(1.0)))) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // image coordinates start at the top left, texture uvs at the bottom left
    gl_FragColor = texture2D(map, vec2(imageCoord.x, 1.0 - imageCoord.y));
  }
`;

/**
 * Dewarps a fisheye camera frame onto the inside of a sphere so the user can
 * look around by dragging and zoom with the scroll wheel.
 */
export default function Camera360Viewer({
  className,
  settings = DEFAULT_FISHEYE_SETTINGS,
  showEdge = false,
  source = null,
  ref,
}: Camera360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateFrameRef = useRef<(image: HTMLImageElement) => void>(() => {});
  const applySettingsRef = useRef<(settings: FisheyeSettings) => void>(
    () => {},
  );
  const settingsRef = useRef(settings);
  const showEdgeRef = useRef(showEdge);
  const applyShowEdgeRef = useRef<(showEdge: boolean) => void>(() => {});

  useEffect(() => {
    showEdgeRef.current = showEdge;
    applyShowEdgeRef.current(showEdge);
  }, [showEdge]);

  const sourceRef = useRef(source);
  const applySourceRef = useRef<(source: Camera360Source | null) => void>(
    () => {},
  );

  useEffect(() => {
    sourceRef.current = source;
    applySourceRef.current(source);
  }, [source]);

  useImperativeHandle(
    ref,
    () => ({
      updateFrame: (image) => updateFrameRef.current(image),
    }),
    [],
  );

  useEffect(() => {
    settingsRef.current = settings;
    applySettingsRef.current(settings);
  }, [settings]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.className = "size-full rounded-lg md:rounded-2xl";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 1, 1100);

    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 60, 40);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      uniforms: {
        map: { value: null },
        hasMap: { value: false },
        center: { value: new THREE.Vector2() },
        radius: { value: 0 },
        imageAspect: { value: 1 },
        lensRotation: { value: new THREE.Matrix3() },
        halfLensFov: { value: Math.PI / 2 },
        showEdge: { value: false },
        edgeColor: {
          value: new THREE.Color().setHex(
            EDGE_COLOR,
            THREE.LinearSRGBColorSpace,
          ),
        },
        edgeWidth: { value: EDGE_WIDTH_PX * window.devicePixelRatio },
      },
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let texture: THREE.Texture<HTMLImageElement | Camera360Source> | null =
      null;
    let textureWidth = 0;
    let textureHeight = 0;
    let lon = 0;
    let lat = 0;
    let frameRequest: number | null = null;

    const render = () => {
      frameRequest = null;
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(
        SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
        SPHERE_RADIUS * Math.cos(phi),
        SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
      );
      renderer.render(scene, camera);
    };

    const requestRender = () => {
      if (frameRequest === null) {
        frameRequest = requestAnimationFrame(render);
      }
    };

    let mount: FisheyeMount | null = null;
    applySettingsRef.current = (settings) => {
      material.uniforms.center.value.set(settings.center_x, settings.center_y);
      material.uniforms.radius.value = settings.radius;
      material.uniforms.halfLensFov.value = THREE.MathUtils.degToRad(
        settings.fov / 2,
      );

      if (settings.mount !== mount) {
        mount = settings.mount;
        // the shader needs the inverse (sphere to lens) of the mount
        // orientation, which for a rotation is the transpose
        material.uniforms.lensRotation.value
          .copy(MOUNT_ORIENTATIONS[mount].lensToSphere)
          .transpose();
        // start out looking at the part of the sphere the lens covers
        lon = 0;
        lat = MOUNT_ORIENTATIONS[mount].defaultLat;
      }

      requestRender();
    };

    applySettingsRef.current(settingsRef.current);

    applyShowEdgeRef.current = (value) => {
      material.uniforms.showEdge.value = value;
      requestRender();
    };
    applyShowEdgeRef.current(showEdgeRef.current);

    // the frame size can change (image requests follow the container size,
    // streams can switch resolution), and three.js allocates immutable
    // texture storage, so the texture is recreated when the size changes
    const uploadFrame = (
      source: HTMLImageElement | Camera360Source,
      width: number,
      height: number,
    ) => {
      if (
        texture &&
        (texture.image !== source ||
          textureWidth !== width ||
          textureHeight !== height)
      ) {
        texture.dispose();
        texture = null;
      }

      if (!texture) {
        // three.js sizes a plain texture from the element's width and height
        // attributes, which are 0 for a video, so video needs VideoTexture
        texture =
          source instanceof HTMLVideoElement
            ? new THREE.VideoTexture(source)
            : new THREE.Texture(source);
        // The shader writes the source pixels straight to the screen, so
        // the texture is left without a color space. three.js stores images
        // and video differently when one is set (it leaves video undecoded),
        // which made video look washed out after being encoded a second time.
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        textureWidth = width;
        textureHeight = height;
        material.uniforms.map.value = texture;
        material.uniforms.hasMap.value = true;
        material.uniforms.imageAspect.value = width / height;
      }

      texture.needsUpdate = true;
      requestRender();
    };

    updateFrameRef.current = (image) => {
      uploadFrame(image, image.naturalWidth, image.naturalHeight);
    };

    let stopSource = () => {};

    applySourceRef.current = (source) => {
      stopSource();

      if (!source) {
        return;
      }

      let stopped = false;
      stopSource = () => {
        stopped = true;
      };

      const onSourceFrame = () => {
        if (stopped) {
          return;
        }

        if (source instanceof HTMLVideoElement) {
          if (
            source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            source.videoWidth > 0
          ) {
            uploadFrame(source, source.videoWidth, source.videoHeight);
          }
        } else if (source.width > 0 && source.height > 0) {
          uploadFrame(source, source.width, source.height);
        }

        // only wakes up when a video presents a new frame, where supported.
        // A canvas has no such signal, so it is copied on every repaint.
        if (
          source instanceof HTMLVideoElement &&
          "requestVideoFrameCallback" in source
        ) {
          source.requestVideoFrameCallback(onSourceFrame);
        } else {
          requestAnimationFrame(onSourceFrame);
        }
      };

      onSourceFrame();
    };
    applySourceRef.current(sourceRef.current);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) {
        return;
      }
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      requestRender();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let dragStart: { x: number; y: number; lon: number; lat: number } | null =
      null;

    const onPointerDown = (e: PointerEvent) => {
      renderer.domElement.setPointerCapture(e.pointerId);
      dragStart = { x: e.clientX, y: e.clientY, lon, lat };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart) {
        return;
      }
      // the vertical field of view spans the height of the canvas on screen,
      // so this many degrees per pixel keeps the picture under the cursor
      // at any player size and zoom
      const screenHeight = renderer.domElement.getBoundingClientRect().height;
      if (screenHeight === 0) {
        return;
      }
      const speed = camera.fov / screenHeight;
      lon = dragStart.lon - (e.clientX - dragStart.x) * speed;
      lat = THREE.MathUtils.clamp(
        dragStart.lat + (e.clientY - dragStart.y) * speed,
        -MAX_LAT,
        MAX_LAT,
      );
      requestRender();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
      dragStart = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.fov = THREE.MathUtils.clamp(
        camera.fov + e.deltaY * 0.05,
        MIN_FOV,
        MAX_FOV,
      );
      camera.updateProjectionMatrix();
      requestRender();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      updateFrameRef.current = () => {};
      applySettingsRef.current = () => {};
      applyShowEdgeRef.current = () => {};
      applySourceRef.current = () => {};
      stopSource();
      if (frameRequest !== null) {
        cancelAnimationFrame(frameRequest);
      }
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("cursor-grab active:cursor-grabbing", className)}
    />
  );
}
