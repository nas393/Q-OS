"use client";

import { Component, Suspense, createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, AnimationMixer, BoxGeometry, CanvasTexture, CylinderGeometry, Group, Material, MathUtils, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, SphereGeometry, Vector3, type AnimationAction } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { seededRandom } from "@/lib/simulation/catalogue";
import type { EmployeeAgent } from "@/lib/simulation/types";

/* The office floor is fictional and drawn with simple real-world materials: carpet, wood, glass, fabric, and screens with
   live-looking charts. Every desk, room and person comes from the simulation state, so the picture always matches the data. */

type V3 = [number, number, number];
type Textures = { carpet: CanvasTexture | null; wood: CanvasTexture | null; plaster: CanvasTexture | null; screens: (CanvasTexture | null)[] };
type Mats = ReturnType<typeof makeMaterials>;

const BOX = new BoxGeometry(1, 1, 1);
const CYL = new CylinderGeometry(1, 1, 1, 18);
const SPHERE = new SphereGeometry(1, 16, 12);
const PLANE = new PlaneGeometry(1, 1);
const MatContext = createContext<Mats | null>(null);
const useMats = () => {
  const m = useContext(MatContext);
  if (!m) throw new Error("Office materials are not ready.");
  return m;
};

const MODEL_URLS = [
  "https://models.vinish.dev/people/business-man.glb",
  "https://models.vinish.dev/people/business-woman.glb",
  "https://models.vinish.dev/people/casual-man.glb",
  "https://models.vinish.dev/people/casual-woman.glb",
];

/* ---------- textures (painted once, in the browser) ---------- */

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]): CanvasTexture | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}

function makeTextures(): Textures {
  const carpet = paint(256, 256, ctx => {
    ctx.fillStyle = "#5d6772";
    ctx.fillRect(0, 0, 256, 256);
    const r = seededRandom("carpet");
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5);
    }
  }, [9, 6]);
  const wood = paint(512, 512, ctx => {
    const r = seededRandom("wood");
    ctx.fillStyle = "#b58256";
    ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row++) {
      const shade = 0.88 + r() * 0.22;
      ctx.fillStyle = `rgb(${Math.round(181 * shade)},${Math.round(130 * shade)},${Math.round(86 * shade)})`;
      ctx.fillRect(0, row * 64, 512, 64);
      ctx.strokeStyle = "rgba(60,36,18,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, row * 64);
      ctx.lineTo(512, row * 64);
      ctx.stroke();
      for (let g = 0; g < 14; g++) {
        ctx.strokeStyle = `rgba(70,40,20,${0.05 + r() * 0.08})`;
        ctx.beginPath();
        const y = row * 64 + r() * 64;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(128, y + r() * 6 - 3, 384, y + r() * 6 - 3, 512, y);
        ctx.stroke();
      }
    }
  }, [2, 2]);
  const plaster = paint(256, 256, ctx => {
    ctx.fillStyle = "#f2eee6";
    ctx.fillRect(0, 0, 256, 256);
    const r = seededRandom("plaster");
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(120,110,95,${r() * 0.035})`;
      ctx.fillRect(r() * 256, r() * 256, 2, 2);
    }
  }, [3, 2]);
  const screens = [0, 1, 2].map(variant => paint(256, 160, ctx => {
    const r = seededRandom(`screen-${variant}`);
    ctx.fillStyle = "#0e1923";
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = "#16283a";
    ctx.fillRect(0, 0, 256, 22);
    ctx.fillStyle = "#cfd8e3";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(["Revenue", "Pipeline", "Tasks"][variant], 8, 15);
    const accents = ["#3fb58a", "#e0b25c", "#5aa7d6"];
    if (variant === 0) {
      for (let i = 0; i < 7; i++) {
        const h = 30 + r() * 90;
        ctx.fillStyle = accents[i % 3];
        ctx.fillRect(14 + i * 33, 150 - h, 20, h);
      }
    } else if (variant === 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      for (let y = 40; y < 150; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
      ctx.strokeStyle = accents[1];
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const x = 8 + i * 15.5, y = 60 + r() * 80 - i * 1.2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      for (let row = 0; row < 6; row++) {
        const y = 34 + row * 20;
        ctx.fillStyle = row % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.0)";
        ctx.fillRect(0, y - 10, 256, 20);
        ctx.fillStyle = accents[row % 3];
        ctx.beginPath();
        ctx.arc(14, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9fb0c2";
        ctx.fillRect(28, y - 2, 60 + r() * 70, 4);
        ctx.fillStyle = "#e7edf4";
        ctx.fillRect(190, y - 2, 40, 4);
      }
    }
  }));
  return { carpet, wood, plaster, screens };
}

function makeMaterials(t: Textures) {
  const std = (o: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial(o);
  const screen = (map: CanvasTexture | null) => std({ map, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: map ? 0.6 : 0, roughness: 0.35 });
  return {
    carpet: std({ map: t.carpet, roughness: 0.97 }),
    wood: std({ map: t.wood, roughness: 0.55, color: "#e9c99f" }),
    woodDark: std({ map: t.wood, roughness: 0.5, color: "#7d5a3b" }),
    plaster: std({ map: t.plaster, roughness: 0.92, color: "#f4f0e8" }),
    metal: std({ color: "#2a2f37", roughness: 0.38, metalness: 0.65 }),
    chrome: std({ color: "#c9ced6", roughness: 0.2, metalness: 0.9 }),
    fabric: std({ color: "#3a4452", roughness: 0.96 }),
    fabricLight: std({ color: "#8a94a0", roughness: 0.96 }),
    glass: new MeshStandardMaterial({ color: "#a9d0e2", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    bezel: std({ color: "#0d1014", roughness: 0.3 }),
    screens: t.screens.map(screen),
    paper: std({ color: "#f3f1ec", roughness: 0.9 }),
    ceramic: std({ color: "#f1ece3", roughness: 0.45 }),
    leaf: std({ color: "#3f7d55", roughness: 0.8 }),
    pot: std({ color: "#8f6d52", roughness: 0.85 }),
    keyboard: std({ color: "#1e2328", roughness: 0.6 }),
    notebooks: [std({ color: "#c9a24a", roughness: 0.5 }), std({ color: "#5aa7d6", roughness: 0.5 }), std({ color: "#65b987", roughness: 0.5 })],
    lamp: std({ color: "#fff3d6", emissive: "#ffe2a8", emissiveIntensity: 0.8, roughness: 0.4 }),
  };
}

function disposeAll(value: unknown) {
  if (value instanceof MeshStandardMaterial) value.dispose();
  else if (Array.isArray(value)) value.forEach(disposeAll);
  else if (value && typeof value === "object") Object.values(value).forEach(disposeAll);
}

/* ---------- primitives ---------- */

function Box({ p, s, m, rot = [0, 0, 0] }: { p: V3; s: V3; m: Material; rot?: V3 }) {
  /* Small parts do not cast shadows: it keeps the frame rate up on phones. */
  return <mesh geometry={BOX} material={m} position={p} rotation={rot} scale={s} castShadow={Math.max(...s) > 0.12} receiveShadow />;
}
function Cyl({ p, r, h, m, rot = [0, 0, 0] }: { p: V3; r: number; h: number; m: Material; rot?: V3 }) {
  return <mesh geometry={CYL} material={m} position={p} rotation={rot} scale={[r, h, r]} castShadow receiveShadow />;
}
function Ball({ p, r, m }: { p: V3; r: number; m: Material }) {
  return <mesh geometry={SPHERE} material={m} position={p} scale={r} castShadow />;
}

/* ---------- furniture ---------- */

function OfficeChair({ p, rot = 0 }: { p: V3; rot?: number }) {
  const m = useMats();
  return <group position={p} rotation={[0, rot, 0]}>
    <Box p={[0, 0.5, 0]} s={[0.52, 0.08, 0.5]} m={m.fabric} />
    <Box p={[0, 0.92, 0.25]} s={[0.5, 0.62, 0.07]} m={m.fabric} />
    <Box p={[-0.28, 0.66, 0]} s={[0.05, 0.18, 0.4]} m={m.metal} />
    <Box p={[0.28, 0.66, 0]} s={[0.05, 0.18, 0.4]} m={m.metal} />
    <Cyl p={[0, 0.26, 0]} r={0.03} h={0.42} m={m.chrome} />
    <Cyl p={[0, 0.04, 0]} r={0.26} h={0.05} m={m.metal} />
  </group>;
}

/* A desk with a monitor, keyboard and a few personal props. The person stands at the chair at +z. */
function Workstation({ p, variant, executive }: { p: V3; variant: number; executive: boolean }) {
  const m = useMats();
  const top = executive ? m.woodDark : m.wood;
  const screen = m.screens[variant % m.screens.length];
  return <group position={p}>
    <Box p={[0, 0.75, 0]} s={executive ? [2.2, 0.07, 1.0] : [1.7, 0.06, 0.8]} m={top} />
    <Box p={[-0.8, 0.37, 0]} s={[0.05, 0.72, 0.74]} m={m.metal} />
    <Box p={[0.8, 0.37, 0]} s={[0.05, 0.72, 0.74]} m={m.metal} />
    <Box p={[0, 0.35, -0.36]} s={[1.6, 0.66, 0.03]} m={top} />
    <Box p={[0.56, 0.36, 0.08]} s={[0.42, 0.66, 0.66]} m={top} />
    <Box p={[0.56, 0.5, 0.42]} s={[0.12, 0.02, 0.03]} m={m.chrome} />
    <Box p={[0, 0.79, -0.26]} s={[0.3, 0.02, 0.2]} m={m.bezel} />
    <Box p={[0, 0.95, -0.26]} s={[0.05, 0.3, 0.05]} m={m.bezel} />
    <Box p={[0, 1.14, -0.27]} s={[0.66, 0.4, 0.035]} m={m.bezel} />
    <mesh geometry={PLANE} material={screen ?? m.bezel} position={[0, 1.14, -0.2465]} scale={[0.6, 0.35, 1]} />
    {variant === 0 && <>
      <Box p={[0.72, 1.14, -0.3]} s={[0.5, 0.3, 0.03]} m={m.bezel} rot={[0, -0.35, 0]} />
      <mesh geometry={PLANE} material={m.screens[1] ?? m.bezel} position={[0.72, 1.14, -0.28]} rotation={[0, -0.35, 0]} scale={[0.46, 0.27, 1]} />
    </>}
    <Box p={[0, 0.8, 0.12]} s={[0.44, 0.02, 0.14]} m={m.keyboard} />
    <Box p={[0.32, 0.81, 0.12]} s={[0.07, 0.025, 0.11]} m={m.keyboard} />
    <Box p={[-0.52, 0.79, 0.1]} s={[0.24, 0.012, 0.31]} m={m.paper} rot={[0, 0.12, 0]} />
    <Box p={[-0.5, 0.81, 0.16]} s={[0.2, 0.02, 0.26]} m={m.notebooks[variant % 3]} rot={[0, 0.4, 0]} />
    <Cyl p={[0.6, 0.85, -0.12]} r={0.045} h={0.1} m={m.ceramic} />
    {variant === 1 && <>
      <Cyl p={[0.65, 0.8, -0.22]} r={0.07} h={0.02} m={m.metal} />
      <Box p={[0.65, 1.02, -0.22]} s={[0.02, 0.44, 0.02]} m={m.metal} />
      <Box p={[0.6, 1.25, -0.16]} s={[0.14, 0.05, 0.12]} m={m.lamp} rot={[0.4, 0, 0]} />
    </>}
    {variant === 2 && <>
      <Cyl p={[-0.6, 0.9, -0.22]} r={0.08} h={0.14} m={m.pot} />
      <Ball p={[-0.6, 1.03, -0.22]} r={0.12} m={m.leaf} />
      <Ball p={[-0.52, 1.1, -0.28]} r={0.09} m={m.leaf} />
    </>}
    <OfficeChair p={[0, 0, 1.0]} />
  </group>;
}

function MeetingTable({ p }: { p: V3 }) {
  const m = useMats();
  return <group position={p}>
    <Box p={[0, 0.76, 0]} s={[3.8, 0.07, 1.6]} m={m.woodDark} />
    {[-1.7, 1.7].map(x => [-0.5, 0.5].map(z => <Box key={x + "" + z} p={[x, 0.37, z]} s={[0.08, 0.72, 0.08]} m={m.metal} />))}
    {[-1.2, 0, 1.2].map(x => <OfficeChair key={"n" + x} p={[x, 0, -1.15]} rot={Math.PI} />)}
    {[-1.2, 0, 1.2].map(x => <OfficeChair key={"s" + x} p={[x, 0, 1.15]} />)}
    <Box p={[0, 1.7, 0.1]} s={[2.4, 1.3, 0.04]} m={m.bezel} />
    <mesh geometry={PLANE} material={m.screens[0] ?? m.bezel} position={[0, 1.7, 0.13]} scale={[2.3, 1.2, 1]} />
  </group>;
}

function Sofa({ p, rot = 0 }: { p: V3; rot?: number }) {
  const m = useMats();
  return <group position={p} rotation={[0, rot, 0]}>
    <Box p={[0, 0.3, 0]} s={[2.4, 0.42, 0.9]} m={m.fabricLight} />
    <Box p={[0, 0.7, -0.36]} s={[2.4, 0.5, 0.2]} m={m.fabricLight} />
    {[-0.8, 0, 0.8].map(x => <Box key={x} p={[x, 0.56, 0.05]} s={[0.78, 0.14, 0.7]} m={m.fabric} />)}
  </group>;
}

function Plant({ p, scale = 1 }: { p: V3; scale?: number }) {
  const m = useMats();
  return <group position={p} scale={scale}>
    <Cyl p={[0, 0.3, 0]} r={0.28} h={0.6} m={m.pot} />
    {[[0, 0.95, 0, 0.36], [0.2, 1.2, 0.1, 0.3], [-0.2, 1.15, -0.1, 0.32], [0.05, 1.42, -0.12, 0.26]].map(([x, y, z, r], i) =>
      <Ball key={i} p={[x, y, z]} r={r} m={m.leaf} />)}
  </group>;
}

function GlassPanel({ p, s }: { p: V3; s: V3 }) {
  const m = useMats();
  return <>
    <mesh position={p} scale={s}><boxGeometry args={[1, 1, 1]} /><primitive object={m.glass} attach="material" /></mesh>
    <Box p={[p[0], p[1] + s[1] / 2, p[2]]} s={[s[0] || 0.05, 0.05, s[2] || 0.05]} m={m.metal} />
    <Box p={[p[0], p[1] - s[1] / 2, p[2]]} s={[s[0] || 0.05, 0.05, s[2] || 0.05]} m={m.metal} />
  </>;
}

/* ---------- the building ---------- */

function Building({ employees }: { employees: EmployeeAgent[] }) {
  const m = useMats();
  const workstations = employees.filter(e => e.position);
  return <group>
    {/* floor: carpet across the workspace */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} scale={[44, 30, 1]} receiveShadow geometry={PLANE} material={m.carpet} />
    {/* perimeter: plaster base, glass band, plaster head, and steel mullions */}
    {[-21.4, 21.4].map(x => <group key={"x" + x}>
      <Box p={[x, 0.45, 0]} s={[0.4, 0.9, 30]} m={m.plaster} />
      <Box p={[x, 3.3, 0]} s={[0.4, 0.4, 30]} m={m.plaster} />
      <mesh position={[x, 1.95, 0]} scale={[0.1, 2.4, 29.4]} material={m.glass}><boxGeometry args={[1, 1, 1]} /></mesh>
    </group>)}
    {[-14.4, 14.4].map(z => <group key={"z" + z}>
      <Box p={[0, 0.45, z]} s={[43, 0.9, 0.4]} m={m.plaster} />
      <Box p={[0, 3.3, z]} s={[43, 0.4, 0.4]} m={m.plaster} />
      <mesh position={[0, 1.95, z]} scale={[42.6, 2.4, 0.1]} material={m.glass}><boxGeometry args={[1, 1, 1]} /></mesh>
    </group>)}
    {Array.from({ length: 15 }, (_, i) => -21 + i * 3).map(x => <Box key={"mx" + x} p={[x, 1.95, 14.4]} s={[0.08, 2.4, 0.12]} m={m.metal} />)}
    {Array.from({ length: 11 }, (_, i) => -15 + i * 3).map(z => <Box key={"mz" + z} p={[21.4, 1.95, z]} s={[0.12, 2.4, 0.08]} m={m.metal} />)}
    {/* boardroom: glass walls, table, and a wall screen */}
    <group position={[16, 0, -9]}>
      <GlassPanel p={[0, 1.6, -2.5]} s={[6, 2.9, 0.04]} />
      <GlassPanel p={[0, 1.6, 2.5]} s={[6, 2.9, 0.04]} />
      <GlassPanel p={[-3, 1.6, 0]} s={[0.04, 2.9, 5]} />
      <GlassPanel p={[3, 1.6, 0]} s={[0.04, 2.9, 5]} />
      <MeetingTable p={[0, 0, 0]} />
    </group>
    {/* lounge: two sofas, a coffee table and plants */}
    <group position={[16, 0, 10.6]}>
      <Sofa p={[0, 0, -1.5]} />
      <Sofa p={[0, 0, 1.5]} rot={Math.PI} />
      <Cyl p={[0, 0.3, 0]} r={0.6} h={0.05} m={m.woodDark} />
      <Cyl p={[0, 0.15, 0]} r={0.08} h={0.3} m={m.metal} />
    </group>
    <Plant p={[19.2, 0, 12.4]} scale={1.1} />
    <Plant p={[12.6, 0, 8.6]} scale={0.9} />
    {/* kitchen: counter, coffee machine, fridge and stools */}
    <group position={[-17, 0, 10]}>
      <Box p={[0, 0.45, 0]} s={[4.2, 0.9, 0.7]} m={m.woodDark} />
      <Box p={[0, 0.92, 0]} s={[4.3, 0.05, 0.8]} m={m.wood} />
      <Box p={[-1.2, 1.15, 0]} s={[0.4, 0.5, 0.4]} m={m.metal} />
      <Box p={[-2.9, 1.1, -0.1]} s={[0.9, 2.2, 0.8]} m={m.chrome} />
      {[-0.8, 0, 0.8].map(x => <Cyl key={x} p={[x, 0.35, 1.6]} r={0.2} h={0.7} m={m.metal} />)}
    </group>
    <Plant p={[-19.8, 0, -12.4]} scale={1.2} />
    <Plant p={[19.8, 0, -12.6]} scale={1.2} />
    <Plant p={[-19.8, 0, 12.6]} scale={1.1} />
    {/* workstations: one per person, at the position the simulation holds for them */}
    {workstations.map((e, i) => <Workstation key={e.id} p={[e.position.x, 0, e.position.z]} variant={i} executive={e.tier === "leadership" && e.id === "ceo"} />)}
  </group>;
}

/* ---------- people ---------- */

function Character({ employee, asset, onSelect, selected }: { employee: EmployeeAgent; asset: GLTF; onSelect: (id: string) => void; selected: boolean }) {
  const root = useRef<Group>(null), mixer = useRef<AnimationMixer | null>(null), action = useRef<AnimationAction | null>(null);
  const model = useMemo(() => clone(asset.scene), [asset]);
  useEffect(() => {
    const m = new AnimationMixer(model);
    mixer.current = m;
    return () => { m.stopAllAction(); mixer.current = null; };
  }, [asset, model]);
  useEffect(() => {
    const m = mixer.current;
    if (!m) return;
    const preferred = employee.activity === "walking" ? /walk/i : /idle/i;
    const clip = asset.animations.find(a => preferred.test(a.name)) ?? asset.animations.find(a => /idle/i.test(a.name)) ?? asset.animations[0];
    if (!clip) return;
    const next = m.clipAction(clip);
    next.reset().fadeIn(0.22).play();
    action.current?.fadeOut(0.22);
    action.current = next;
  }, [asset, employee.activity]);
  useFrame((_, delta) => {
    mixer.current?.update(Math.min(delta, 0.05));
    const g = root.current;
    if (!g) return;
    /* Someone working at a desk stands at their chair and faces the screen. */
    const atDesk = employee.activity === "working" && !employee.destination;
    const target = new Vector3(employee.position.x, 0, employee.position.z + (atDesk ? 0.95 : 0));
    g.position.lerp(target, 1 - Math.exp(-delta * 6));
    let want = g.rotation.y;
    if (atDesk) want = Math.PI;
    else if (employee.destination) want = Math.atan2(employee.destination.x - employee.position.x, employee.destination.z - employee.position.z);
    g.rotation.y = MathUtils.damp(g.rotation.y, want, 5, delta);
  });
  return <group ref={root} position={[employee.position.x, 0, employee.position.z]} onClick={e => { e.stopPropagation(); onSelect(employee.id); }}>
    <primitive object={model} scale={0.98} />
    {selected && <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.72, 0.84, 48]} /><meshBasicMaterial color="#e1bd70" transparent opacity={0.95} /></mesh>}
    <mesh position={[0, 2.12, 0]}><sphereGeometry args={[0.045, 12, 12]} /><meshBasicMaterial color={employee.activity === "working" ? "#65c18a" : employee.activity === "walking" ? "#e1bd70" : "#7c8793"} /></mesh>
  </group>;
}

/* Each person's model is loaded once and cached. Loading never throws into React: a failure is only recorded, and that
   person is shown with a simple figure. Every promise here settles, so none is left unhandled. */
type ModelEntry = { status: "pending" | "ok" | "error"; value?: GLTF; done: Promise<void> };
const modelCache = new Map<string, ModelEntry>();
function startModel(url: string): ModelEntry {
  const existing = modelCache.get(url);
  if (existing) return existing;
  const entry: ModelEntry = { status: "pending", done: Promise.resolve() };
  entry.done = fetch(url, { credentials: "omit" })
    .then(r => { if (!r.ok) throw new Error(`Model ${url} returned HTTP ${r.status}`); return r.arrayBuffer(); })
    .then(buffer => new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(buffer, "", resolve, reject)))
    .then(
      v => { entry.status = "ok"; entry.value = v; },
      err => { entry.status = "error"; console.warn("Executive World: a character model could not load; a simple figure is shown instead.", err); });
  modelCache.set(url, entry);
  return entry;
}
function PersonFallback({ employee, selected, onSelect }: { employee: EmployeeAgent; selected: boolean; onSelect: (id: string) => void }) {
  return <group position={[employee.position.x, 0, employee.position.z]} onClick={event => { event.stopPropagation(); onSelect(employee.id); }}>
    <mesh position={[0, 1.02, 0]} castShadow><capsuleGeometry args={[0.25, 0.72, 5, 10]} /><meshStandardMaterial color={employee.id === "ceo" ? "#b89a68" : "#526779"} /></mesh>
    <mesh position={[0, 1.72, 0]} castShadow><sphereGeometry args={[0.19, 16, 16]} /><meshStandardMaterial color="#bd9274" roughness={0.8} /></mesh>
    {selected && <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.72, 0.84, 32]} /><meshBasicMaterial color="#e1bd70" /></mesh>}
  </group>;
}
function PersonModel({ employee, url, selected, onSelect }: { employee: EmployeeAgent; url: string; selected: boolean; onSelect: (id: string) => void }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const entry = startModel(url);
  useEffect(() => { let live = true; entry.done.then(() => { if (live) rerender(); }); return () => { live = false; }; }, [entry]);
  if (entry.status !== "ok" || !entry.value) return <PersonFallback employee={employee} selected={selected} onSelect={onSelect} />;
  return <Character employee={employee} asset={entry.value} selected={selected} onSelect={onSelect} />;
}
function People({ employees, selected, onSelect }: { employees: EmployeeAgent[]; selected: string; onSelect: (id: string) => void }) {
  return <>{employees.map((employee, index) => {
    const isSelected = selected === employee.id;
    const fallback = <PersonFallback employee={employee} selected={isSelected} onSelect={onSelect} />;
    return <SceneErrorBoundary key={employee.id} label={`figure for ${employee.name}`} fallback={fallback}>
      <PersonModel employee={employee} url={MODEL_URLS[index % MODEL_URLS.length]} selected={isSelected} onSelect={onSelect} />
    </SceneErrorBoundary>;
  })}</>;
}

/* ---------- camera, scene and boundaries ---------- */

/* A boundary for any part of the 3D world: if it fails, the fallback shows and the rest of the page keeps working. */
export class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error(`Executive World: ${this.props.label ?? "part of the 3D view"} failed; showing a fallback.`, error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export type CameraMode = "CEO" | "FREE" | "FOLLOW" | "CINEMA";
function CameraRig({ mode, followPosition }: { mode: CameraMode; followPosition: { x: number; z: number } }) {
  const { camera } = useThree(), elapsed = useRef(0);
  useEffect(() => {
    const target = mode === "CEO" ? new Vector3(0, 9, 18) : mode === "FOLLOW" ? new Vector3(followPosition.x + 6, 4.6, followPosition.z + 7) : new Vector3(30, 24, 32);
    camera.position.copy(target);
    camera.lookAt(mode === "FOLLOW" ? new Vector3(followPosition.x, 1, followPosition.z) : new Vector3(0, 0, 0));
  }, [camera, mode]);
  useFrame((_, delta) => {
    if (mode === "FOLLOW") {
      camera.position.lerp(new Vector3(followPosition.x + 6, 4.6, followPosition.z + 7), 1 - Math.exp(-delta * 2.4));
      camera.lookAt(followPosition.x, 1.1, followPosition.z);
      return;
    }
    if (mode !== "CINEMA") return;
    elapsed.current += delta;
    const a = elapsed.current * 0.075;
    camera.position.lerp(new Vector3(Math.cos(a) * 34, 17 + Math.sin(a * 0.7) * 2.2, Math.sin(a) * 34), 1 - Math.exp(-delta * 0.65));
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

function Lights() {
  return <>
    <hemisphereLight args={["#e6f1ff", "#5b4d3c", 1.1]} />
    <directionalLight position={[-16, 26, 12]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={20} shadow-camera-bottom={-20} />
    {[[-12, 4.2, -6], [0, 4.2, -2], [12, 4.2, 2], [-6, 4.2, 8], [14, 4.2, -9], [16, 4.2, 10]].map(([x, y, z], i) =>
      <pointLight key={i} position={[x, y, z]} intensity={0.4} distance={22} color="#f6e2b8" />)}
  </>;
}

/** Everything that is drawn: the building, the people, the camera and the controls. */
export function WorldScene({ employees, selected, onSelect, cameraMode }: { employees: EmployeeAgent[]; selected: string; onSelect: (id: string) => void; cameraMode: CameraMode }) {
  const textures = useMemo(() => makeTextures(), []);
  const mats = useMemo(() => makeMaterials(textures), [textures]);
  useEffect(() => () => {
    disposeAll(mats);
    textures.carpet?.dispose(); textures.wood?.dispose(); textures.plaster?.dispose();
    textures.screens.forEach(t => t?.dispose());
  }, [mats, textures]);
  const selectedEmployee = employees.find(e => e.id === selected);
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [30, 24, 32], fov: 40, near: 0.1, far: 160 }} gl={{ antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
    <color attach="background" args={["#0f1720"]} />
    <fog attach="fog" args={["#0f1720", 60, 118]} />
    <ambientLight intensity={0.5} />
    <Lights />
    <Environment resolution={256} environmentIntensity={0.42}>
      <Lightformer intensity={2.2} position={[0, 9, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} color="#f4e6cc" />
      <Lightformer intensity={0.9} position={[-15, 5, -10]} scale={[10, 6, 1]} color="#9fc4d4" />
      <Lightformer intensity={0.7} position={[15, 5, 10]} scale={[10, 6, 1]} color="#e1bd70" />
    </Environment>
    <MatContext.Provider value={mats}>
      <Building employees={employees} />
      <CameraRig mode={cameraMode} followPosition={selectedEmployee?.position ?? { x: 0, z: 0 }} />
      <Suspense fallback={null}><People employees={employees} selected={selected} onSelect={onSelect} /></Suspense>
    </MatContext.Provider>
    <ContactShadows position={[0, -0.02, 0]} opacity={0.35} scale={46} blur={2.4} far={5} />
    <OrbitControls enabled={cameraMode === "FREE"} makeDefault target={[0, 0, 0]} minDistance={9} maxDistance={58} maxPolarAngle={Math.PI / 2.08} minPolarAngle={0.18} enableDamping dampingFactor={0.08} />
  </Canvas>;
}
