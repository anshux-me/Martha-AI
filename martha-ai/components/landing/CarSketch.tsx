import { useId } from "react";
import type { Model } from "@/lib/knowledge/catalogue";

/**
 * Pencil-style side-elevation sketches of the (fictional) Martha models.
 * Line work only: a slightly wobbly outline drawn twice (overdraw), hatched shading,
 * construction lines at the axles, a dimension line, and one mint accent (the light bar).
 */

type Shape = {
  body: string; // closed outline incl. wheel arches
  glass: string; // window openings
  details: string; // door cuts, belt line, handles, etc.
  light: string; // front light bar (accent)
  wheels: [number, number]; // wheel centre x (y = 128)
  span: [number, number]; // overall length extents (x)
  lengthMm: string;
};

const SHAPES: Record<Model["id"], Shape> = {
  spark: {
    body: "M58 128 L56 100 Q56 84 66 76 L80 62 Q92 50 112 50 L200 50 Q220 51 232 62 L262 88 Q300 92 326 98 Q340 102 342 114 L343 128 L313 128 A29 29 0 0 0 255 128 L141 128 A29 29 0 0 0 83 128 Z",
    glass: "M74 84 L88 66 Q96 58 112 58 L160 58 L160 84 Z M168 84 L168 58 L198 58 Q214 59 224 68 L246 86 L168 86",
    details: "M60 92 L292 92 M164 58 L164 126 M190 100 L204 100 M118 100 L130 100 M56 116 L78 116",
    light: "M322 101 L338 105",
    wheels: [112, 284],
    span: [56, 343],
    lengthMm: "3,850",
  },
  terra: {
    body: "M34 128 L33 96 Q34 84 44 80 L62 64 Q74 53 92 52 L226 52 Q248 53 262 64 L296 88 Q330 91 356 95 Q372 98 375 110 L377 128 L329 128 A29 29 0 0 0 271 128 L129 128 A29 29 0 0 0 71 128 Z",
    glass: "M66 84 L84 62 Q88 59 96 59 L160 59 L160 84 Z M168 84 L168 59 L224 59 Q242 60 254 70 L276 86 L168 86",
    details: "M40 92 L320 92 M164 59 L164 126 M232 95 L234 126 M190 100 L206 100 M114 100 L128 100 M98 48 L222 48 M34 116 L60 116",
    light: "M352 99 L370 103",
    wheels: [100, 300],
    span: [33, 377],
    lengthMm: "4,520",
  },
  aero: {
    body: "M30 124 L30 108 Q31 98 44 96 L92 90 Q120 70 150 62 Q172 57 200 57 L226 58 Q248 60 264 74 L284 90 L352 98 Q370 101 374 112 L376 124 Q376 128 370 128 L329 128 A29 29 0 0 0 271 128 L133 128 A29 29 0 0 0 75 128 L36 128 Q30 128 30 124 Z",
    glass: "M106 90 Q130 72 152 67 L176 66 L176 90 Z M184 90 L184 66 L222 66 Q242 68 256 80 L266 90 Z",
    details: "M44 100 L300 100 M180 66 L180 126 M262 100 L264 126 M210 106 L224 106 M128 106 L142 106 M30 116 L58 116",
    light: "M348 102 L368 106",
    wheels: [104, 300],
    span: [30, 376],
    lengthMm: "4,780",
  },
  atlas: {
    body: "M30 128 L29 92 Q30 80 42 76 L62 58 Q70 50 86 49 L258 49 Q276 50 288 60 L318 84 L362 92 Q376 95 378 108 L380 128 L347 128 A29 29 0 0 0 289 128 L125 128 A29 29 0 0 0 67 128 Z",
    glass: "M62 82 L84 59 L134 59 L134 82 Z M142 82 L142 59 L200 59 L200 84 Z M208 84 L208 59 L254 59 Q268 60 278 68 L300 84 L208 84",
    details: "M36 90 L334 90 M138 59 L138 126 M204 59 L204 126 M262 93 L264 126 M226 98 L242 98 M160 98 L176 98 M92 45 L250 45 M30 114 L56 114",
    light: "M358 97 L374 101",
    wheels: [96, 318],
    span: [29, 380],
    lengthMm: "4,960",
  },
  voltgt: {
    body: "M26 122 Q26 110 38 106 L84 98 Q118 74 156 66 Q178 62 196 63 Q222 65 244 80 L270 96 L352 104 Q372 107 376 116 L378 124 Q378 128 372 128 L335 128 A29 29 0 0 0 277 128 L137 128 A29 29 0 0 0 79 128 L32 128 Q26 128 26 122 Z",
    glass: "M108 96 Q136 76 164 71 L194 70 Q216 72 234 84 L246 96 Z",
    details: "M40 108 L310 108 M196 70 L198 126 M216 112 L232 112 M30 104 L50 101 M100 114 L118 104",
    light: "M350 108 L370 112",
    wheels: [108, 306],
    span: [26, 378],
    lengthMm: "4,630",
  },
};

function Wheel({ cx }: { cx: number }) {
  const spokes = [0, 72, 144, 216, 288].map((deg) => {
    const r = (deg * Math.PI) / 180;
    return `M${cx + Math.cos(r) * 6} ${128 + Math.sin(r) * 6} L${cx + Math.cos(r) * 15} ${128 + Math.sin(r) * 15}`;
  });
  return (
    <g>
      <circle cx={cx} cy={128} r={24} />
      <circle cx={cx} cy={128} r={21.5} opacity={0.45} />
      <circle cx={cx} cy={128} r={16} />
      <circle cx={cx} cy={128} r={4} />
      <path d={spokes.join(" ")} />
    </g>
  );
}

export function CarSketch({
  model,
  className,
  annotate = false,
}: {
  model: Model["id"];
  className?: string;
  /** Hero variant: adds leader-line callouts. */
  annotate?: boolean;
}) {
  const s = SHAPES[model];
  const id = useId().replace(/:/g, "");
  const [x0, x1] = s.span;

  return (
    <svg
      viewBox={annotate ? "0 -44 400 234" : "0 0 400 180"}
      className={className}
      role="img"
      aria-label={`Pencil sketch of the ${model} (side view)`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <filter id={`wobble-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
        <pattern id={`hatch-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="0.7" />
        </pattern>
        <clipPath id={`clip-${id}`}>
          <path d={s.body} />
        </clipPath>
      </defs>

      {/* construction lines */}
      <g stroke="currentColor" strokeWidth="0.6" opacity="0.28" strokeDasharray="2 4">
        <path d={`M6 152 H394`} strokeDasharray="none" opacity="0.9" />
        <path d={`M${s.wheels[0]} 60 V160 M${s.wheels[1]} 60 V160`} />
        <path d={`M${x0 - 6} 128 H${x1 + 6}`} />
      </g>

      <g filter={`url(#wobble-${id})`} stroke="currentColor">
        {/* shading: hatch the lower body */}
        <rect x="0" y="98" width="400" height="32" fill={`url(#hatch-${id})`} opacity="0.22" clipPath={`url(#clip-${id})`} stroke="none" />
        {/* overdraw (a second, slightly offset pencil pass) */}
        <path d={s.body} strokeWidth="1.1" opacity="0.35" transform="translate(0.9 0.7)" />
        {/* main outline */}
        <path d={s.body} strokeWidth="1.9" />
        <path d={s.glass} strokeWidth="1.3" opacity="0.85" />
        <path d={s.details} strokeWidth="1" opacity="0.6" />
        <g strokeWidth="1.4">
          <Wheel cx={s.wheels[0]} />
          <Wheel cx={s.wheels[1]} />
        </g>
        {/* ground shadow scribble */}
        <path
          d={`M${x0 + 16} 154 Q${(x0 + x1) / 2} 158 ${x1 - 16} 154`}
          strokeWidth="0.8"
          opacity="0.4"
        />
      </g>

      {/* accent: light bar */}
      <path d={s.light} stroke="var(--accent)" strokeWidth="2.4" />

      {/* dimension line */}
      <g stroke="currentColor" strokeWidth="0.7" opacity="0.5">
        <path d={`M${x0} 166 H${x1} M${x0} 162 V170 M${x1} 162 V170`} />
      </g>
      <text
        x={(x0 + x1) / 2}
        y="177"
        textAnchor="middle"
        fill="currentColor"
        opacity="0.55"
        fontSize="8"
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.08em"
      >
        {s.lengthMm} MM
      </text>

      {annotate && (
        <g fill="currentColor" stroke="currentColor" fontFamily="var(--font-jetbrains), monospace" fontSize="8.5">
          <g strokeWidth="0.7" opacity="0.7" fill="none">
            <path d="M150 52 L128 -6 H64" />
            <path d="M215 116 L238 -24 H300" />
            <path d="M362 101 L382 24 H394" />
          </g>
          <g stroke="none">
            <circle cx="150" cy="52" r="2" />
            <circle cx="215" cy="116" r="2" />
            <circle cx="362" cy="101" r="2" />
            <text x="64" y="-11" opacity="0.85">PANORAMIC ROOF</text>
            <text x="242" y="-29" opacity="0.85">72 kWh · 500 KM</text>
            <text x="394" y="17" opacity="0.85" textAnchor="end">LED LIGHT BAR</text>
          </g>
        </g>
      )}
    </svg>
  );
}
