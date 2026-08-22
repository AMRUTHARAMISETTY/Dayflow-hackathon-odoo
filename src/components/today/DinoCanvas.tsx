import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useAnimations, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { useReducedMotion } from "../../hooks/useReducedMotion"
import type { MascotEvent, MascotStatus } from "./TodayMascot"

interface Props { status: MascotStatus; event: MascotEvent; hours: string; onEventComplete: () => void }
const preferredClip: Record<MascotStatus, string> = { "not-checked-in": "Sleep", "checking-in": "Jump", working: "Idle", "working-late": "Idle", overtime: "Idle", "day-complete": "Idle" }

function Model({ status, event, onEventComplete }: Omit<Props, "hours">) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF("/models/dino.glb")
  const { actions, names } = useAnimations(animations, group)
  const reduced = useReducedMotion()
  const previous = useRef<THREE.AnimationAction | null>(null)
  const [clicked, setClicked] = useState(false)
  const clip = (wanted: string) => names.find((name) => name.toLowerCase() === wanted.toLowerCase()) ?? names[0]
  const play = (wanted: string, once = false, speed = 1) => {
    const name = clip(wanted); const next = name ? actions[name] : undefined
    if (!next) return
    previous.current?.fadeOut(0.3)
    next.reset().setEffectiveTimeScale(speed).fadeIn(0.3).play()
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity)
    next.clampWhenFinished = once; previous.current = next
  }

  useEffect(() => {
    if (reduced) { play("Idle", true); return }
    if (event === "check-in") {
      play("Jump", true)
      const roar = window.setTimeout(() => play("Roar", true), 650)
      const idle = window.setTimeout(() => { play("Idle"); onEventComplete() }, 1750)
      return () => { window.clearTimeout(roar); window.clearTimeout(idle) }
    }
    if (event === "revert") { play("Sleep", false, 0.75); onEventComplete(); return }
    const speed = status === "overtime" ? 0.6 : status === "working-late" ? 0.8 : status === "not-checked-in" ? 0.7 : 1
    play(preferredClip[status], false, speed)
  }, [status, event, reduced, names])

  useEffect(() => {
    if (!clicked || reduced) return
    play("Roar", true)
    const timer = window.setTimeout(() => setClicked(false), 900)
    return () => window.clearTimeout(timer)
  }, [clicked, reduced])

  useFrame((state) => {
    if (!group.current || reduced || clicked) return
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.pointer.x * 0.2, 0.04)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -state.pointer.y * 0.08, 0.04)
  })
  return <primitive ref={group} object={scene} position={[0, -1.2, 0]} scale={1.25} onClick={() => setClicked(true)} />
}

function Effects({ active }: { active: boolean }) {
  const { camera } = useThree(); const started = useRef(0)
  const points = useMemo(() => {
    const positions = new Float32Array(90)
    for (let i = 0; i < 30; i += 1) { positions[i * 3] = (Math.random() - 0.5) * 2.4; positions[i * 3 + 1] = -1.25 + Math.random() * 0.25; positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8 }
    return positions
  }, [])
  useEffect(() => { if (active) started.current = performance.now() }, [active])
  useFrame(() => {
    if (!active || !started.current) return
    const elapsed = performance.now() - started.current
    camera.position.x = elapsed > 580 && elapsed < 780 ? Math.sin(elapsed * 0.12) * 0.05 * (1 - (elapsed - 580) / 200) : 0
  })
  if (!active) return null
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.22, 0]}><ringGeometry args={[0.8, 0.82, 48]} /><meshBasicMaterial color="#6B7280" transparent opacity={0.25} /></mesh><points><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><pointsMaterial color="#B9B09B" size={0.055} transparent opacity={0.7} /></points></>
}

export default function DinoCanvas(props: Props) {
  const reduced = useReducedMotion(); const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update) }, [])
  return <Canvas dpr={[1, 2]} frameloop={visible && !reduced ? "always" : "demand"} camera={{ position: [0, 0.15, 5], fov: 34 }} shadows gl={{ alpha: true, antialias: true }} aria-label="Animated Dayflow dinosaur"><ambientLight intensity={1.6} /><directionalLight position={[3, 5, 4]} intensity={2.2} castShadow shadow-mapSize={[512, 512]} /><Model status={props.status} event={props.event} onEventComplete={props.onEventComplete} />{!reduced && <Effects active={props.event === "check-in"} />}</Canvas>
}

useGLTF.preload("/models/dino.glb")
