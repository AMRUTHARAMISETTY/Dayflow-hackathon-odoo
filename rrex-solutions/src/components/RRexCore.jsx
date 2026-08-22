import { Component, Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'

function CircuitPulse({ children, speed = 1, baseOpacity = 0.55 }) {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * speed
    ref.current.material.opacity = baseOpacity + Math.sin(t * 2) * 0.35 * baseOpacity
  })
  return <primitive object={children} ref={ref} />
}

function EyeCore({ position, phase = 0 }) {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * 1.6 + phase
    const glow = 0.6 + Math.sin(t) * 0.4
    ref.current.material.emissiveIntensity = glow * 2.2
  })
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#0d0b09" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh ref={ref} position={[0, 0, 0.045]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color="#C97A3D"
          emissive="#C97A3D"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function CoreSculpture({ reduced }) {
  const group = useRef(null)

  const craniumEdges = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.1, 1)
    return new THREE.EdgesGeometry(geo, 1)
  }, [])

  const jawEdges = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(0.55, 0)
    return new THREE.EdgesGeometry(geo, 1)
  }, [])

  useFrame((_, delta) => {
    if (!group.current || reduced) return
    group.current.rotation.y += delta * 0.16
    group.current.rotation.x = Math.sin(Date.now() * 0.00012) * 0.08
  })

  const craniumLines = useMemo(
    () =>
      new THREE.LineSegments(
        craniumEdges,
        new THREE.LineBasicMaterial({ color: '#C97A3D', transparent: true, opacity: 0.6 }),
      ),
    [craniumEdges],
  )

  const jawLines = useMemo(
    () =>
      new THREE.LineSegments(
        jawEdges,
        new THREE.LineBasicMaterial({ color: '#8B5E3C', transparent: true, opacity: 0.7 }),
      ),
    [jawEdges],
  )

  return (
    <group ref={group} scale={1.35}>
      {/* Cranium */}
      <mesh scale={[1, 1.08, 0.88]}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial
          color="#241d18"
          roughness={0.4}
          metalness={0.45}
          emissive="#3a2416"
          emissiveIntensity={0.3}
        />
      </mesh>
      <group scale={[1, 1.08, 0.88]}>
        <CircuitPulse speed={0.9} baseOpacity={0.55}>{craniumLines}</CircuitPulse>
      </group>

      {/* Jaw */}
      <group position={[0, -0.95, 0.05]} rotation={[0.15, 0, 0]}>
        <mesh scale={[1.15, 0.6, 0.85]}>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#1c1611" roughness={0.5} metalness={0.35} />
        </mesh>
        <group scale={[1.15, 0.6, 0.85]}>
          <CircuitPulse speed={1.3} baseOpacity={0.6}>{jawLines}</CircuitPulse>
        </group>
      </group>

      {/* Eye cores */}
      <EyeCore position={[-0.42, 0.12, 0.82]} phase={0} />
      <EyeCore position={[0.42, 0.12, 0.82]} phase={1.4} />

      {/* Seam rings — circuitry banding across the skull */}
      <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[1.02, 0.012, 8, 64]} />
        <meshBasicMaterial color="#C97A3D" toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 1.6, -0.4, 0.3]}>
        <torusGeometry args={[0.98, 0.01, 8, 64]} />
        <meshBasicMaterial color="#8B5E3C" toneMapped={false} transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

function Scene({ reduced }) {
  return (
    <>
      <ambientLight intensity={0.35} color="#4a3626" />
      <pointLight position={[-3, 1.5, -2]} intensity={18} color="#C97A3D" />
      <pointLight position={[2.5, -1, 2]} intensity={6} color="#E8DCC8" />
      <pointLight position={[0, 3, 3]} intensity={4} color="#8B5E3C" />
      {reduced ? (
        <CoreSculpture reduced />
      ) : (
        <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.7}>
          <CoreSculpture reduced={false} />
        </Float>
      )}
      {!reduced && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={0.75} mipmapBlur />
        </EffectComposer>
      )}
    </>
  )
}

function Fallback({ className }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-amber-500/30 bg-obsidian-800/70 shadow-amberGlow">
        <span className="font-display text-3xl font-bold text-amber-400">R</span>
        <div className="absolute inset-0 animate-pulseSlow rounded-full ring-1 ring-amber-500/40" />
      </div>
    </div>
  )
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export default function RRexCore({ className = '', variant = 'hero' }) {
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)

  if (failed) return <Fallback className={className} />

  return (
    <div className={className}>
      <CanvasErrorBoundary fallback={<Fallback className="h-full w-full" />}>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, variant === 'avatar' ? 4.2 : 5], fov: 42 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              'webglcontextlost',
              (e) => {
                e.preventDefault()
                setFailed(true)
              },
              false,
            )
          }}
          onError={() => setFailed(true)}
        >
          <Suspense fallback={null}>
            <Scene reduced={reduced} />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
}
