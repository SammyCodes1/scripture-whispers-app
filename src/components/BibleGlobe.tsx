import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { type BiblicalLocation } from '@/data/biblicalLocations';

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

function Globe() {
  const globeRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <Sphere ref={globeRef} args={[2, 64, 64]}>
      <meshStandardMaterial
        color="#8B7355"
        roughness={0.8}
        metalness={0.1}
        wireframe={false}
      />
    </Sphere>
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
    <div className="w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-b from-secondary/30 to-background">
      <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} />

        <Globe />
        <GlobeGrid />

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
