import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export type LightColor = 'red' | 'green';

type RedLightSceneProps = {
  light: LightColor;
  reducedMotion: boolean;
  /** Incrementa en cada tap correcto para disparar partículas */
  burstKey: number;
};

const GREEN = new THREE.Color('#06d6a0');
const RED = new THREE.Color('#ff2d55');
const CYAN = new THREE.Color('#00e5ff');
const GOLD = new THREE.Color('#ffd60a');

function HologramOrb({ light, reducedMotion }: { light: LightColor; reducedMotion: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const color = light === 'green' ? GREEN : RED;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * (light === 'red' ? 5.5 : 3.2)) * (light === 'red' ? 0.1 : 0.06);
    if (core.current) {
      core.current.scale.setScalar(pulse);
      const mat = core.current.material as THREE.MeshStandardMaterial;
      mat.emissive.copy(color);
      mat.emissiveIntensity = light === 'green' ? 1.45 : 2.1;
      mat.color.copy(color).multiplyScalar(0.35);
    }
    if (glow.current) {
      const gMat = glow.current.material as THREE.MeshBasicMaterial;
      gMat.color.copy(color);
      gMat.opacity = reducedMotion ? 0.18 : 0.2 + Math.sin(t * 4) * 0.1;
      glow.current.scale.setScalar(1.35 + (reducedMotion ? 0 : Math.sin(t * 2.4) * 0.1));
    }
    if (ring.current) {
      ring.current.rotation.z = t * (reducedMotion ? 0.15 : light === 'red' ? 1.2 : 0.55);
      ring.current.rotation.x = Math.PI / 2.4;
      const rMat = ring.current.material as THREE.MeshStandardMaterial;
      rMat.emissive.copy(color);
      rMat.emissiveIntensity = light === 'red' ? 1.4 : 0.9;
    }
    if (ring2.current) {
      ring2.current.rotation.z = -t * (reducedMotion ? 0.1 : 0.4);
      ring2.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <Float
      speed={reducedMotion ? 0.4 : light === 'green' ? 1.6 : 0.35}
      rotationIntensity={reducedMotion ? 0.05 : light === 'green' ? 0.35 : 0.08}
      floatIntensity={reducedMotion ? 0.15 : light === 'green' ? 0.55 : 0.12}
    >
      <group>
        <mesh ref={core}>
          <sphereGeometry args={[0.95, 48, 48]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.4}
            roughness={0.18}
            metalness={0.72}
          />
        </mesh>
        <mesh ref={glow}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <mesh ref={ring} scale={[1.55, 1.55, 1.55]}>
          <torusGeometry args={[1.05, 0.035, 16, 96]} />
          <meshStandardMaterial
            color={CYAN}
            emissive={color}
            emissiveIntensity={0.8}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        <mesh ref={ring2} scale={[1.85, 1.85, 1.85]}>
          <torusGeometry args={[1.15, 0.012, 12, 80]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={light === 'green' ? CYAN : RED}
            emissiveIntensity={0.55}
            metalness={0.85}
            roughness={0.25}
            transparent
            opacity={0.55}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <torusGeometry args={[1.35, 0.018, 12, 80]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={CYAN}
            emissiveIntensity={0.45}
            metalness={0.85}
            roughness={0.25}
            transparent
            opacity={0.65}
          />
        </mesh>
      </group>
    </Float>
  );
}

function ArenaFloor({ light }: { light: LightColor }) {
  const ring = useRef<THREE.Mesh>(null);
  const color = light === 'green' ? GREEN : RED;

  useFrame((state) => {
    if (!ring.current) return;
    const mat = ring.current.material as THREE.MeshStandardMaterial;
    mat.emissive.copy(color);
    mat.color.copy(color);
    mat.emissiveIntensity = 0.45 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
  });

  return (
    <group position={[0, -1.35, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.2, 64]} />
        <meshStandardMaterial
          color="#0a0e18"
          metalness={0.85}
          roughness={0.35}
          emissive="#061018"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.8, 2.05, 64]} />
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={0.55}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>
      <gridHelper args={[8, 24, '#123048', '#0c1824']} position={[0, 0.02, 0]} />
    </group>
  );
}

/** Haz de escaneo cuando está en rojo (como la muñeca) */
function ScanBeam({ light, reducedMotion }: { light: LightColor; reducedMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const on = light === 'red';
    mesh.current.visible = on;
    if (!on) return;
    const t = state.clock.elapsedTime;
    mesh.current.position.x = reducedMotion ? 0 : Math.sin(t * 2.2) * 1.4;
    const mat = mesh.current.material as THREE.MeshBasicMaterial;
    mat.opacity = reducedMotion ? 0.12 : 0.1 + Math.sin(t * 6) * 0.06;
  });

  return (
    <mesh ref={mesh} position={[0, 0.4, 0.8]} visible={false}>
      <planeGeometry args={[0.35, 4.2]} />
      <meshBasicMaterial color="#ff2d55" transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function TapBurst({
  burstKey,
  light,
  reducedMotion,
}: {
  burstKey: number;
  light: LightColor;
  reducedMotion: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const start = useRef(0);
  const active = useRef(false);
  const lastKey = useRef(0);

  const count = reducedMotion ? 24 : 72;
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI;
      const sp = 1.2 + Math.random() * 2.6;
      velocities[i * 3] = Math.sin(b) * Math.cos(a) * sp;
      velocities[i * 3 + 1] = Math.cos(b) * sp;
      velocities[i * 3 + 2] = Math.sin(b) * Math.sin(a) * sp;
    }
    return { positions, velocities };
  }, [count, burstKey]);

  useFrame((state) => {
    if (!points.current) return;
    if (burstKey > 0 && burstKey !== lastKey.current) {
      lastKey.current = burstKey;
      active.current = true;
      start.current = state.clock.elapsedTime;
      const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) attr.setXYZ(i, 0, 0, 0);
      attr.needsUpdate = true;
      points.current.visible = true;
    }
    if (!active.current) return;
    const t = state.clock.elapsedTime - start.current;
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const life = 0.55;
    if (t > life) {
      points.current.visible = false;
      active.current = false;
      return;
    }
    for (let i = 0; i < attr.count; i++) {
      attr.setXYZ(i, velocities[i * 3] * t, velocities[i * 3 + 1] * t, velocities[i * 3 + 2] * t);
    }
    attr.needsUpdate = true;
    const mat = points.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - t / life;
    mat.color.copy(light === 'green' ? GREEN : RED);
  });

  return (
    <points ref={points} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} transparent depthWrite={false} color={GREEN} sizeAttenuation />
    </points>
  );
}

export function RedLightScene({ light, reducedMotion, burstKey }: RedLightSceneProps) {
  return (
    <>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 5.5, 13]} />
      <ambientLight intensity={0.32} />
      <pointLight
        position={[0, 2.2, 2]}
        intensity={light === 'green' ? 30 : 42}
        color={light === 'green' ? '#06d6a0' : '#ff2d55'}
        distance={12}
      />
      <pointLight position={[-3, 1.5, -2]} intensity={8} color="#00e5ff" distance={10} />
      <spotLight
        position={[0, 5, 2]}
        angle={0.45}
        penumbra={0.6}
        intensity={light === 'green' ? 18 : 28}
        color={light === 'green' ? '#8cffd4' : '#ff8aa0'}
      />

      <ArenaFloor light={light} />
      <HologramOrb light={light} reducedMotion={reducedMotion} />
      <ScanBeam light={light} reducedMotion={reducedMotion} />
      <TapBurst burstKey={burstKey} light={light} reducedMotion={reducedMotion} />

      {!reducedMotion && (
        <Sparkles
          count={48}
          scale={[6, 3.2, 6]}
          size={2.6}
          speed={light === 'red' ? 0.15 : 0.4}
          opacity={0.5}
          color={light === 'green' ? '#06d6a0' : '#ff4d6d'}
        />
      )}
    </>
  );
}
