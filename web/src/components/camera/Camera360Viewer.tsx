import { Ref, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { DEFAULT_FISHEYE_SETTINGS, FisheyeSettings } from "@/types/fisheye";

export type Camera360ViewerHandle = {
  /** Upload the latest decoded frame to the fisheye texture. */
  updateFrame: (image: HTMLImageElement) => void;
};

type Camera360ViewerProps = {
  className?: string;
  settings?: FisheyeSettings;
  /** Outline the edge of the fisheye circle on the sphere, for calibration. */
  showEdge?: boolean;
  ref?: Ref<Camera360ViewerHandle>;
};

const SPHERE_RADIUS = 500;
const DEFAULT_FOV = 75;
const MIN_FOV = 30;
const MAX_FOV = 100;
const DEFAULT_LAT = -45;
const MAX_LAT = 85;
const DRAG_SENSITIVITY = 0.15;
const EDGE_COLOR = 0xff3333;
const EDGE_WIDTH_PX = 3;

const vertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Assumes an equidistant fisheye lens. In the lens frame the optical axis points down (-Y), image +x maps to +X
// and image +y (down) maps to +Z. lensRotation takes sphere directions into
// the lens frame, which applies the pan and tilt calibration.
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

    #include <colorspace_fragment>
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
        edgeColor: { value: new THREE.Color(EDGE_COLOR) },
        edgeWidth: { value: EDGE_WIDTH_PX * window.devicePixelRatio },
      },
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let texture: THREE.Texture<HTMLImageElement> | null = null;
    let lon = 0;
    let lat = DEFAULT_LAT;
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

    const lensToSphere = new THREE.Matrix4();
    applySettingsRef.current = ({
      center_x,
      center_y,
      radius,
      fov,
      pan,
      tilt,
    }) => {
      material.uniforms.center.value.set(center_x, center_y);
      material.uniforms.radius.value = radius;
      material.uniforms.halfLensFov.value = THREE.MathUtils.degToRad(fov / 2);
      // tilt swings the lens axis from straight down toward +X, then pan
      // rotates it around the vertical axis. The shader needs the inverse
      // (sphere to lens), which for a rotation is the transpose.
      lensToSphere.makeRotationFromEuler(
        new THREE.Euler(
          0,
          THREE.MathUtils.degToRad(pan),
          THREE.MathUtils.degToRad(tilt),
          "YZX",
        ),
      );
      material.uniforms.lensRotation.value
        .setFromMatrix4(lensToSphere)
        .transpose();
      requestRender();
    };

    applySettingsRef.current(settingsRef.current);

    applyShowEdgeRef.current = (value) => {
      material.uniforms.showEdge.value = value;
      requestRender();
    };
    applyShowEdgeRef.current(showEdgeRef.current);

    updateFrameRef.current = (image) => {
      // the frame size can change with the container size, and three.js
      // allocates immutable texture storage, so recreate on size changes
      if (
        texture &&
        (texture.image.naturalWidth !== image.naturalWidth ||
          texture.image.naturalHeight !== image.naturalHeight)
      ) {
        texture.dispose();
        texture = null;
      }

      if (!texture) {
        texture = new THREE.Texture<HTMLImageElement>(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        material.uniforms.map.value = texture;
        material.uniforms.hasMap.value = true;
        material.uniforms.imageAspect.value =
          image.naturalWidth / image.naturalHeight;
      }

      texture.needsUpdate = true;
      requestRender();
    };

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
      // scale drag speed with zoom so panning feels consistent
      const speed = DRAG_SENSITIVITY * (camera.fov / DEFAULT_FOV);
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
