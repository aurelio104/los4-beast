import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Circle,
  CircleCheck,
  CircleX,
  Crosshair,
  Hexagon,
  Square,
  Star,
  Triangle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSquareCanvas } from '../../lib/useSquareCanvas';
import { playClickSound, playLoseSound, playWinSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';

const TIP_KEY = 'reto_honey_tip_seen';
const SHAPE_KEY = 'reto_honey_shape';
const R_FRAC = 0.32;
const BAND_FRAC = 0.042;
const PATH_BUCKETS = 48;
const MIN_SAMPLES = 60;

/** Bandas un poco más generosas en figuras difíciles */
const BAND_MULT: Record<HoneyShapeId, number> = {
  circle: 1,
  triangle: 1.06,
  square: 1.06,
  hexagon: 1.14,
  star: 1.22
};

export type HoneyShapeId = 'circle' | 'triangle' | 'square' | 'hexagon' | 'star';

export type HoneycombGameProps = {
  onFinish: (precision: number) => void;
  onBack: () => void;
};

type Pt = { x: number; y: number };
type PathSeg = { a: Pt; b: Pt; startLen: number; len: number };
type Phase = 'idle' | 'drawing' | 'review' | 'done';

type ShapePath = {
  id: HoneyShapeId;
  verts: Pt[];
  segs: PathSeg[];
  totalLen: number;
  band: number;
  cx: number;
  cy: number;
  radius: number;
  start: Pt;
};

type ShapeOpt = {
  id: HoneyShapeId;
  label: string;
  Icon: LucideIcon;
  /** para frases: el círculo / la estrella */
  gender: 'm' | 'f';
};

const SHAPE_OPTS: ShapeOpt[] = [
  { id: 'circle', label: 'Círculo', Icon: Circle, gender: 'm' },
  { id: 'triangle', label: 'Triángulo', Icon: Triangle, gender: 'm' },
  { id: 'square', label: 'Cuadrado', Icon: Square, gender: 'm' },
  { id: 'hexagon', label: 'Hexágono', Icon: Hexagon, gender: 'm' },
  { id: 'star', label: 'Estrella', Icon: Star, gender: 'f' }
];

function readStoredShape(): HoneyShapeId {
  try {
    const v = sessionStorage.getItem(SHAPE_KEY);
    if (SHAPE_OPTS.some((s) => s.id === v)) return v as HoneyShapeId;
  } catch {
    /* ignore */
  }
  return 'circle';
}

function shapeCopy(id: HoneyShapeId) {
  const opt = SHAPE_OPTS.find((s) => s.id === id)!;
  const noun = opt.label.toLowerCase();
  if (opt.gender === 'f') {
    return {
      label: opt.label,
      idle: `Traza la ${noun} completa`,
      drawing: `Mantén el trazo sobre la ${noun}…`,
      start: `Empieza en el punto dorado`
    };
  }
  return {
    label: opt.label,
    idle: `Traza el ${noun} completo`,
    drawing: `Mantén el trazo sobre el ${noun}…`,
    start: `Empieza en el punto dorado`
  };
}

function scoreTitle(p: number): { title: string; tone: 'low' | 'ok' | 'great' } {
  if (p >= 90) return { title: 'Corte perfecto', tone: 'great' };
  if (p >= 75) return { title: 'Corte casi perfecto', tone: 'great' };
  if (p >= 60) return { title: 'Buen corte', tone: 'ok' };
  if (p >= 35) return { title: 'Corte flojo', tone: 'low' };
  return { title: 'Necesitas más exactitud', tone: 'low' };
}

function estimatedBp(precision: number): number {
  return Math.round(precision * 1.2);
}

function regularPolygon(cx: number, cy: number, r: number, n: number, rot = -Math.PI / 2): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function starVerts(cx: number, cy: number, outerR: number, innerR: number, spikes = 5): Pt[] {
  const pts: Pt[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const a = -Math.PI / 2 + (i / total) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function circleVerts(cx: number, cy: number, r: number, samples = 72): Pt[] {
  return regularPolygon(cx, cy, r, samples, -Math.PI / 2);
}

function shapeVertices(id: HoneyShapeId, w: number): { verts: Pt[]; cx: number; cy: number; radius: number; start: Pt } {
  const cx = w / 2;
  const cy = w / 2;
  const radius = w * R_FRAC;
  switch (id) {
    case 'circle': {
      const verts = circleVerts(cx, cy, radius);
      return { verts, cx, cy, radius, start: verts[0] };
    }
    case 'triangle': {
      const verts = regularPolygon(cx, cy, radius * 1.05, 3);
      return { verts, cx, cy, radius, start: verts[0] };
    }
    case 'square': {
      const half = radius * 0.78;
      const verts = [
        { x: cx - half, y: cy - half },
        { x: cx + half, y: cy - half },
        { x: cx + half, y: cy + half },
        { x: cx - half, y: cy + half }
      ];
      return { verts, cx, cy, radius, start: verts[0] };
    }
    case 'hexagon': {
      const verts = regularPolygon(cx, cy, radius, 6, Math.PI / 6);
      return { verts, cx, cy, radius, start: verts[0] };
    }
    case 'star': {
      const verts = starVerts(cx, cy, radius * 1.05, radius * 0.42);
      return { verts, cx, cy, radius, start: verts[0] };
    }
  }
}

function buildPath(id: HoneyShapeId, w: number): ShapePath {
  const { verts, cx, cy, radius, start } = shapeVertices(id, w);
  const band = w * BAND_FRAC * BAND_MULT[id];
  const segs: PathSeg[] = [];
  let totalLen = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, startLen: totalLen, len });
    totalLen += len;
  }
  return { id, verts, segs, totalLen: Math.max(totalLen, 1), band, cx, cy, radius, start };
}

function distToSegment(p: Pt, a: Pt, b: Pt): { dist: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return { dist: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { dist: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)), t };
}

function queryPath(p: Pt, path: ShapePath): { dist: number; arcT: number } {
  let best = Infinity;
  let bestArc = 0;
  for (const s of path.segs) {
    const { dist, t } = distToSegment(p, s.a, s.b);
    if (dist < best) {
      best = dist;
      bestArc = (s.startLen + t * s.len) / path.totalLen;
    }
  }
  return { dist: best, arcT: bestArc };
}

function coverageOf(trail: Pt[], path: ShapePath): number {
  const buckets = new Array<boolean>(PATH_BUCKETS).fill(false);
  for (const p of trail) {
    const { dist, arcT } = queryPath(p, path);
    if (dist <= path.band) {
      buckets[Math.floor(arcT * PATH_BUCKETS) % PATH_BUCKETS] = true;
    }
  }
  return buckets.filter(Boolean).length / PATH_BUCKETS;
}

function computePrecision(trail: Pt[], path: ShapePath): number {
  if (trail.length < 12) return 0;
  let inBand = 0;
  let errorSum = 0;
  for (const p of trail) {
    const { dist } = queryPath(p, path);
    errorSum += dist;
    if (dist <= path.band) inBand++;
  }
  const n = trail.length;
  const inBandRatio = inBand / n;
  const meanErr = errorSum / n;
  const radialQuality = Math.max(0, 1 - meanErr / (path.band * 2.2));
  const coverage = coverageOf(trail, path);
  let score = 100 * (0.4 * inBandRatio + 0.3 * radialQuality + 0.3 * coverage);
  if (n < MIN_SAMPLES) score *= 0.55 + 0.45 * (n / MIN_SAMPLES);
  if (coverage < 0.7) score *= 0.55 + 0.45 * (coverage / 0.7);
  if (inBandRatio < 0.55) score *= 0.7;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function pointTone(p: Pt, path: ShapePath): 'good' | 'ok' | 'bad' {
  const { dist } = queryPath(p, path);
  if (dist <= path.band * 0.55) return 'good';
  if (dist <= path.band) return 'ok';
  return 'bad';
}

function strokeClosed(ctx: CanvasRenderingContext2D, verts: Pt[]) {
  if (verts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  path: ShapePath,
  opts?: { trail?: Pt[]; showStart?: boolean; startPulse?: number }
) {
  const { cx, cy, radius, band, verts, id, start } = path;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, w * 0.72);
  bg.addColorStop(0, 'rgba(0, 45, 60, 0.6)');
  bg.addColorStop(0.55, 'rgba(8, 12, 22, 0.94)');
  bg.addColorStop(1, 'rgba(5, 7, 13, 1)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.07)';
  ctx.lineWidth = 1;
  const hexR = w * 0.08;
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const hx = cx + col * hexR * 1.55 + (row % 2 ? hexR * 0.78 : 0);
      const hy = cy + row * hexR * 1.35;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = hx + Math.cos(a) * hexR * 0.55;
        const y = hy + Math.sin(a) * hexR * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  if (id === 'circle') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + band, 0, Math.PI * 2);
    ctx.arc(cx, cy, Math.max(2, radius - band), 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255, 214, 10, 0.12)';
    ctx.fill();
    for (const r of [radius - band, radius + band]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 214, 10, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else {
    strokeClosed(ctx, verts);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 214, 10, 0.18)';
    ctx.lineWidth = band * 2.4;
    ctx.stroke();
    strokeClosed(ctx, verts);
    ctx.strokeStyle = 'rgba(255, 214, 10, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  strokeClosed(ctx, verts);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
  ctx.lineWidth = 10;
  ctx.stroke();

  strokeClosed(ctx, verts);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (id !== 'circle') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const v of verts) {
      ctx.beginPath();
      ctx.arc(v.x, v.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (radius - band - 6), cy + Math.sin(a) * (radius - band - 6));
      ctx.lineTo(cx + Math.cos(a) * (radius + band + 6), cy + Math.sin(a) * (radius + band + 6));
      ctx.stroke();
    }
  }

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + Math.cos(a) * (radius * 0.18);
    const y = cy + Math.sin(a) * (radius * 0.18);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 214, 10, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (opts?.showStart) {
    const pulse = 0.55 + 0.45 * Math.sin((opts.startPulse ?? 0) / 180);
    ctx.beginPath();
    ctx.arc(start.x, start.y, 7 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 214, 10, ${0.18 + pulse * 0.2})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(start.x, start.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd60a';
    ctx.shadowColor = 'rgba(255, 214, 10, 0.9)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1200';
    ctx.fill();
  }

  const trail = opts?.trail;
  if (trail && trail.length > 1) {
    for (let i = 1; i < trail.length; i++) {
      const tone = pointTone(trail[i], path);
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.lineCap = 'round';
      ctx.lineWidth = tone === 'good' ? 3.5 : 3;
      if (tone === 'good') {
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = 'rgba(0, 229, 255, 0.85)';
        ctx.shadowBlur = 8;
      } else if (tone === 'ok') {
        ctx.strokeStyle = '#ffd60a';
        ctx.shadowColor = 'rgba(255, 214, 10, 0.7)';
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = '#ff4d6d';
        ctx.shadowColor = 'rgba(255, 45, 85, 0.55)';
        ctx.shadowBlur = 4;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

export default function HoneycombGame({ onFinish, onBack }: HoneycombGameProps) {
  const { wrapRef, canvasRef } = useSquareCanvas(340);
  const [shape, setShape] = useState<HoneyShapeId>(readStoredShape);
  const [phase, setPhase] = useState<Phase>('idle');
  const [precision, setPrecision] = useState<number | null>(null);
  const [livePct, setLivePct] = useState<number | null>(null);
  const [coverage, setCoverage] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const stateRef = useRef({
    drawing: false,
    trail: [] as Pt[],
    finished: false,
    submitted: false,
    shape: shape as HoneyShapeId,
    inBand: null as boolean | null
  });
  stateRef.current.shape = shape;

  const copy = shapeCopy(shape);
  const result = precision != null ? scoreTitle(precision) : null;
  const bpPreview = estimatedBp(precision ?? livePct ?? 0);

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const resetTrail = () => {
    stateRef.current.drawing = false;
    stateRef.current.finished = false;
    stateRef.current.trail = [];
    stateRef.current.inBand = null;
    setPrecision(null);
    setLivePct(null);
    setCoverage(0);
    setPhase('idle');
  };

  const selectShape = (id: HoneyShapeId) => {
    if (phase === 'drawing' || phase === 'done' || stateRef.current.drawing) return;
    setShape(id);
    resetTrail();
    try {
      sessionStorage.setItem(SHAPE_KEY, id);
    } catch {
      /* ignore */
    }
    playClickSound();
    haptic('light');
  };

  const retry = () => {
    if (phase !== 'review' || stateRef.current.submitted) return;
    playClickSound();
    haptic('light');
    resetTrail();
  };

  const confirm = () => {
    if (phase !== 'review' || stateRef.current.submitted || precision == null) return;
    stateRef.current.submitted = true;
    setPhase('done');
    playClickSound();
    onFinish(precision);
  };

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    if (w <= 0) return;
    const path = buildPath(stateRef.current.shape, w);
    const showStart = !stateRef.current.drawing && !stateRef.current.finished;
    drawScene(ctx, w, canvas.clientHeight, path, {
      trail: stateRef.current.trail,
      showStart,
      startPulse: pulse
    });
  }, [canvasRef, pulse]);

  useEffect(() => {
    paint();
  }, [paint, shape, phase]);

  useEffect(() => {
    if (phase !== 'idle') return;
    const id = window.setInterval(() => setPulse((p) => p + 12), 40);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paint, wrapRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase === 'done') return;
    if (phase === 'review') return;

    const local = (e: PointerEvent): Pt => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const updateLive = (trail: Pt[]) => {
      const path = buildPath(stateRef.current.shape, canvas.clientWidth);
      setLivePct(computePrecision(trail, path));
      setCoverage(Math.round(coverageOf(trail, path) * 100));

      const last = trail[trail.length - 1];
      if (last) {
        const inBand = queryPath(last, path).dist <= path.band;
        if (stateRef.current.inBand !== null && stateRef.current.inBand !== inBand) {
          haptic(inBand ? 'light' : 'medium');
        }
        stateRef.current.inBand = inBand;
      }
    };

    const onStart = (e: PointerEvent) => {
      if (stateRef.current.finished || stateRef.current.submitted) return;
      if (phase === 'review') return;
      dismissTip();
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const p = local(e);
      stateRef.current.drawing = true;
      stateRef.current.finished = false;
      stateRef.current.trail = [p];
      stateRef.current.inBand = null;
      setPhase('drawing');
      setPrecision(null);
      setLivePct(null);
      setCoverage(0);
      playClickSound();
      haptic('light');
      paint();
    };

    const onMove = (e: PointerEvent) => {
      if (!stateRef.current.drawing || stateRef.current.finished) return;
      const p = local(e);
      const trail = stateRef.current.trail;
      const last = trail[trail.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 2.2) return;
      trail.push(p);
      if (trail.length > 1200) trail.shift();
      updateLive(trail);
      paint();
    };

    const onEnd = () => {
      if (!stateRef.current.drawing || stateRef.current.finished) return;
      stateRef.current.drawing = false;
      stateRef.current.finished = true;
      const path = buildPath(stateRef.current.shape, canvas.clientWidth);
      const p = computePrecision(stateRef.current.trail, path);
      const cov = Math.round(coverageOf(stateRef.current.trail, path) * 100);
      setPrecision(p);
      setLivePct(p);
      setCoverage(cov);
      setPhase('review');
      paint();
      if (p >= 75) {
        playWinSound();
        haptic('success');
      } else {
        playLoseSound();
        haptic('medium');
      }
    };

    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointercancel', onEnd);
    return () => {
      canvas.removeEventListener('pointerdown', onStart);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onEnd);
      canvas.removeEventListener('pointercancel', onEnd);
    };
  }, [canvasRef, phase, onFinish, paint]);

  const displayPct = precision ?? livePct;
  const tone =
    displayPct == null ? 'idle' : displayPct >= 85 ? 'great' : displayPct >= 60 ? 'ok' : 'low';
  const lockedShapes = phase === 'drawing' || phase === 'done';

  return (
    <div className={`game-honey game-honey--${phase}`}>
      <p className="game-honey__eyebrow">Honeycomb</p>
      <p className="game-honey__title">Precisión</p>

      <div className="game-honey__shapes" role="radiogroup" aria-label="Figura a cortar">
        {SHAPE_OPTS.map(({ id, label, Icon }) => {
          const active = shape === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              disabled={lockedShapes}
              className={`game-honey__shape${active ? ' game-honey__shape--on' : ''}`}
              onClick={() => selectShape(id)}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {showTip && phase === 'idle' && (
        <div className="game-honey__tip">
          <Hexagon size={16} className="text-reto-gold shrink-0" />
          <span>Empieza en el punto dorado y recorre todo el contorno. Puedes reintentar antes de enviar.</span>
          <button type="button" onClick={dismissTip} className="game-honey__tip-ok">
            Ok
          </button>
        </div>
      )}

      <div className="game-honey__meter">
        <div className="game-honey__meter-head">
          <Crosshair size={14} className={tone === 'great' ? 'text-reto-cyan' : 'text-white/45'} />
          <span className={`game-honey__pct game-honey__pct--${tone}`}>
            {displayPct == null ? 'Listo' : `${displayPct}%`}
          </span>
          <span className="game-honey__cov">arco {coverage}%</span>
          {(phase === 'drawing' || phase === 'review') && (
            <span className="game-honey__bp">~{bpPreview} BP</span>
          )}
        </div>
        <div className="game-honey__bar">
          <motion.div
            className={`game-honey__fill game-honey__fill--${tone}`}
            animate={{ width: `${displayPct ?? 0}%` }}
            transition={{ duration: 0.12 }}
          />
        </div>
        <p className="game-honey__hint">
          {phase === 'idle' && copy.idle}
          {phase === 'drawing' && copy.drawing}
          {phase === 'review' && result?.title}
          {phase === 'done' && 'Enviando resultado…'}
        </p>
      </div>

      <div ref={wrapRef} className="game-honey__stage">
        <canvas ref={canvasRef} className="game-honey__canvas" />
      </div>

      {phase === 'idle' && (
        <p className="game-honey__cta-line">
          <span className="game-honey__cta-dot" aria-hidden />
          {copy.start} · toca y traza
        </p>
      )}

      <AnimatePresence>
        {phase === 'review' && precision != null && result && (
          <motion.div
            className={`game-honey__result game-honey__result--${result.tone}`}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-honey__result-icon">
              {result.tone === 'low' ? <CircleX size={22} /> : <CircleCheck size={22} />}
            </div>
            <div className="game-honey__result-body">
              <p className="game-honey__result-title">{result.title}</p>
              <p className="game-honey__result-meta">
                {copy.label} · {precision}% · cobertura {coverage}% · ~{bpPreview} BP
              </p>
              <p className="game-honey__result-note">1 envío por día · puedes reintentar antes</p>
            </div>
            <div className="game-honey__result-actions">
              <button type="button" className="game-honey__retry" onClick={retry}>
                Otra vez
              </button>
              <button type="button" className="game-honey__confirm" onClick={confirm}>
                Enviar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onBack}
        className="game-honey__exit"
        disabled={phase === 'drawing' || phase === 'done'}
      >
        Salir
      </button>
    </div>
  );
}
