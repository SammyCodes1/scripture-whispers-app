import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { type BiblicalLocation } from '@/data/biblicalLocations';

// Procedurally build an Earth-like texture (offline, no assets needed).
// Uses a simplified equirectangular landmass map covering major continents,
// then paints oceans, land, deserts, ice caps, and a soft cloud layer.
function buildEarthTextures() {
  const W = 1024;
  const H = 512;

  // Rough continent outlines as ellipses in lat/lng space.
  // Each: [centerLng, centerLat, halfW(lng), halfH(lat), rotationDeg]
  const continents: [number, number, number, number, number][] = [
    // Africa
    [20, 5, 22, 32, 0],
    [25, -15, 18, 22, -10],
    // Europe
    [15, 50, 25, 13, 0],
    [40, 58, 22, 12, 0],
    // Asia
    [85, 45, 55, 25, 0],
    [105, 30, 35, 22, 0],
    [130, 55, 25, 18, 0],
    // India
    [78, 18, 12, 14, 0],
    // Arabia
    [45, 22, 12, 14, 0],
    // Southeast Asia / Indonesia
    [115, -2, 18, 8, 10],
    // Australia
    [134, -25, 18, 12, 0],
    // North America
    [-100, 45, 35, 22, 0],
    [-95, 30, 22, 14, 0],
    [-80, 18, 12, 10, 20],
    // South America
    [-60, -15, 18, 28, -8],
    [-72, -40, 8, 12, 0],
    // Greenland
    [-40, 72, 12, 10, 0],
    // UK / Scandinavia hint
    [-3, 54, 5, 6, 0],
    [18, 65, 8, 8, 0],
    // Japan
    [138, 38, 4, 8, 20],
    // Madagascar
    [47, -20, 3, 8, 0],
  ];

  function isLand(lng: number, lat: number): number {
    let v = 0;
    for (const [cx, cy, hw, hh, rot] of continents) {
      const r = (rot * Math.PI) / 180;
      let dx = lng - cx;
      // wrap longitude
      if (dx > 180) dx -= 360;
      if (dx < -180) dx += 360;
      const dy = lat - cy;
      const rx = dx * Math.cos(r) + dy * Math.sin(r);
      const ry = -dx * Math.sin(r) + dy * Math.cos(r);
      const d = (rx * rx) / (hw * hw) + (ry * ry) / (hh * hh);
      if (d < 1) v = Math.max(v, 1 - d);
    }
    return v; // 0 = ocean, >0 = land strength
  }

  // Cheap value-noise for terrain variation
  const noiseSeed = (x: number, y: number) => {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const smoothNoise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = noiseSeed(xi, yi);
    const b = noiseSeed(xi + 1, yi);
    const c = noiseSeed(xi, yi + 1);
    const d = noiseSeed(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  const fbm = (x: number, y: number) => {
    let v = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < 4; i++) {
      v += smoothNoise(x * freq, y * freq) * amp;
      amp *= 0.5;
      freq *= 2;
    }
    return v;
  };

  // Color (diffuse) canvas
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  // Bump canvas (grayscale heightmap)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W; bumpCanvas.height = H;
  const bctx = bumpCanvas.getContext('2d')!;
  const bimg = bctx.createImageData(W, H);

  // Specular canvas (water shines, land matte)
  const specCanvas = document.createElement('canvas');
  specCanvas.width = W; specCanvas.height = H;
  const sctx = specCanvas.getContext('2d')!;
  const simg = sctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const lat = 90 - (y / H) * 180;
    for (let x = 0; x < W; x++) {
      const lng = (x / W) * 360 - 180;
      const i = (y * W + x) * 4;

      const land = isLand(lng, lat);
      const n = fbm(x * 0.04, y * 0.04);
      const landMask = land + (n - 0.5) * 0.25;

      let r: number, g: number, b: number, height: number, spec: number;

      if (landMask < 0.05) {
        // Ocean — depth shading
        const depth = Math.min(1, 0.05 - landMask + 0.3);
        r = 18 + depth * 10;
        g = 55 + depth * 30;
        b = 110 + depth * 60;
        height = 60;
        spec = 230;
      } else {
        // Land — biome by latitude + noise
        const absLat = Math.abs(lat);
        const arid = fbm(x * 0.02 + 100, y * 0.02 + 50);
        if (absLat > 70) {
          // Polar ice
          r = 235; g = 240; b = 245;
          spec = 180;
        } else if (absLat > 55) {
          // Tundra / boreal
          r = 110 + n * 30; g = 120 + n * 30; b = 95 + n * 20;
          spec = 60;
        } else if (absLat < 30 && arid > 0.55) {
          // Desert belt
          r = 200 + n * 30; g = 170 + n * 25; b = 110 + n * 20;
          spec = 50;
        } else if (absLat < 15) {
          // Tropical
          r = 50 + n * 30; g = 110 + n * 40; b = 45 + n * 25;
          spec = 60;
        } else {
          // Temperate
          r = 80 + n * 35; g = 130 + n * 40; b = 70 + n * 25;
          spec = 55;
        }
        height = 140 + n * 90 + landMask * 30;
      }

      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = height; bimg.data[i + 3] = 255;
      simg.data[i] = simg.data[i + 1] = simg.data[i + 2] = spec; simg.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  sctx.putImageData(simg, 0, 0);

  // Clouds — separate transparent texture
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = W; cloudCanvas.height = H;
  const cctx = cloudCanvas.getContext('2d')!;
  const cimg = cctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const c = fbm(x * 0.03 + 500, y * 0.03 + 500);
      const a = Math.max(0, c - 0.55) * 2.6;
      cimg.data[i] = 255; cimg.data[i + 1] = 255; cimg.data[i + 2] = 255;
      cimg.data[i + 3] = Math.min(255, a * 220);
    }
  }
  cctx.putImageData(cimg, 0, 0);

  const make = (cv: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const earth = make(canvas);
  const bump = new THREE.CanvasTexture(bumpCanvas);
  const spec = new THREE.CanvasTexture(specCanvas);
  const clouds = make(cloudCanvas);
  return { earth, bump, spec, clouds };
}

// Convert lat/lng to 3D sphere position
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Earth() {
  const globeRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const textures = useMemo(() => buildEarthTextures(), []);

  useFrame((_, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.04;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.055;
  });

  return (
    <group>
      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshPhongMaterial
          map={textures.earth}
          bumpMap={textures.bump}
          bumpScale={0.06}
          specularMap={textures.spec}
          specular={new THREE.Color('#3a5878')}
          shininess={18}
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.03, 64, 64]} />
        <meshPhongMaterial
          map={textures.clouds}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.12, 64, 64]} />
        <meshBasicMaterial
          color="#6ab4ff"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function GlobeGrid() {
  const gridLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    const radius = 2.01;
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 5) {
        pts.push(latLngToVector3(lat, lng, radius));
      }
      lines.push(pts);
    }
    // Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        pts.push(latLngToVector3(lat, lng, radius));
      }
      lines.push(pts);
    }
    return lines;
  }, []);

  return (
    <>
      {gridLines.map((pts, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <primitive key={i} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#a08c6e', opacity: 0.15, transparent: true }))} />
        );
      })}
    </>
  );
}

function LocationPin({
  location,
  isSelected,
  onSelect,
}: {
  location: BiblicalLocation;
  isSelected: boolean;
  onSelect: (loc: BiblicalLocation) => void;
}) {
  const position = useMemo(() => latLngToVector3(location.lat, location.lng, 2.05), [location]);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const target = isSelected || hovered ? 1.6 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 8);
    }
  });

  const color = {
    city: '#dc2626',
    mountain: '#16a34a',
    river: '#2563eb',
    region: '#d97706',
    sea: '#0891b2',
  }[location.category];

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(location);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
        />
      </mesh>
      {(isSelected || hovered) && (
        <Html
          position={[0, 0.1, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap">
            <p className="text-xs font-bold text-card-foreground">{location.name}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraController({ target }: { target: BiblicalLocation | null }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0, 6));

  useFrame((_, delta) => {
    if (target) {
      const pos = latLngToVector3(target.lat, target.lng, 5);
      targetPos.current.lerp(pos, delta * 2);
    } else {
      targetPos.current.lerp(new THREE.Vector3(0, 1, 5), delta * 2);
    }
    camera.position.lerp(targetPos.current, delta * 3);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

interface BibleGlobeProps {
  locations: BiblicalLocation[];
  selectedLocation: BiblicalLocation | null;
  onSelectLocation: (loc: BiblicalLocation) => void;
}

export default function BibleGlobe({ locations, selectedLocation, onSelectLocation }: BibleGlobeProps) {
  return (
    <div className="w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-b from-[#0a1428] to-[#020617]">
      <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, -5]} intensity={0.2} color="#5a8fd6" />

        <Stars radius={50} depth={30} count={1500} factor={2} fade speed={0.5} />
        <Earth />

        {locations.map((loc) => (
          <LocationPin
            key={loc.id}
            location={loc}
            isSelected={selectedLocation?.id === loc.id}
            onSelect={onSelectLocation}
          />
        ))}

        <CameraController target={selectedLocation} />
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={3}
          maxDistance={8}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
