/**
 * Illustrated airport rental lot at dusk — the hero image.
 *
 * Motion is deliberately restrained: a slow lamp warm-up, a gentle
 * beacon, and one aircraft on approach. No twinkling, no vehicles
 * scooting across the frame — those read as novelty rather than craft.
 *
 * All animation is transform/opacity only, and there are no SVG filters
 * or blend modes anywhere: those are what froze Chrome's renderer in an
 * earlier version of the background.
 */
export function TerminalScene({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 440"
      role="img"
      aria-label="Illustration of rental cars parked outside an airport terminal at dusk"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ts-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#191c22" />
          <stop offset="46%" stopColor="#2f2f33" />
          <stop offset="74%" stopColor="#6b5236" />
          <stop offset="100%" stopColor="#b8823f" />
        </linearGradient>
        <linearGradient id="ts-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0a92b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f0a92b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ts-apron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2e34" />
          <stop offset="100%" stopColor="#15171b" />
        </linearGradient>
        <linearGradient id="ts-pool" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0a92b" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#f0a92b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ts-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fb6d8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#2a3038" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* ------------------------------- Sky ------------------------------- */}
      <rect width="1200" height="440" fill="url(#ts-sky)" />
      <ellipse cx="905" cy="298" rx="330" ry="128" fill="url(#ts-sun)" />
      <circle cx="905" cy="290" r="30" fill="#ffc65c" opacity="0.9" />

      {/* Horizon haze */}
      <rect y="268" width="1200" height="34" fill="#c98b3c" opacity="0.16" />

      {/* Aircraft on approach — nose leads, descending left to right. */}
      <g opacity="0.6" className="ts-plane">
        <g transform="translate(0,74) scale(0.62)">
          {/* fuselage: nose at +x so it points along the direction of travel */}
          <path d="M0 12 Q34 0 96 4 L150 6 Q170 7 176 12 Q170 17 150 18 L96 20 Q34 24 0 12 Z" fill="#e9e4da" />
          {/* wings swept back from the nose */}
          <path d="M104 10 L58 -22 L74 -22 L128 8 Z" fill="#cfc9bd" />
          <path d="M104 14 L58 46 L74 46 L128 16 Z" fill="#bdb7ab" />
          {/* tail fin */}
          <path d="M12 11 L2 -12 L14 -12 L30 9 Z" fill="#cfc9bd" />
        </g>
      </g>

      {/* --------------------------- Control tower ------------------------- */}
      <g>
        <rect x="126" y="150" width="24" height="152" fill="#1a1c20" />
        <path d="M114 152 L162 152 L155 128 L121 128 Z" fill="#22252a" />
        <rect x="120" y="130" width="36" height="12" fill="url(#ts-glass)" />
        <circle cx="138" cy="120" r="3.5" fill="#e2622a" className="ts-beacon" />
      </g>

      {/* ------------------------------ Terminal --------------------------- */}
      <g>
        <path d="M206 302 L206 216 Q206 198 228 198 L648 198 Q670 198 670 216 L670 302 Z" fill="#1a1c20" />
        <path d="M200 216 Q200 192 230 192 L646 192 Q676 192 676 216 L676 222 L200 222 Z" fill="#22252a" />

        {/* continuous glazing rather than blinking squares */}
        <rect x="222" y="236" width="432" height="30" rx="2" fill="url(#ts-glass)" />
        {Array.from({ length: 17 }).map((_, index) => (
          <rect key={index} x={222 + index * 26} y={236} width="2" height="30" fill="#1a1c20" opacity="0.7" />
        ))}
        {/* a few lit gates, warming slowly */}
        {[2, 6, 11, 15].map((slot, index) => (
          <rect
            key={slot}
            className="ts-gate"
            x={226 + slot * 26}
            y={238}
            width="20"
            height="26"
            fill="#f0a92b"
            style={{ animationDelay: `${index * 1.4}s` }}
          />
        ))}

        <rect x="242" y="276" width="150" height="15" rx="2" fill="#0e1013" />
        <rect x="246" y="280" width="142" height="7" rx="1" fill="#f0a92b" opacity="0.45" />
      </g>

      {/* Jet bridge only. A parked widebody here read as a pale blob against
          the sun, so the aircraft lives in the approach path instead. */}
      <g opacity="0.7">
        <rect x="670" y="252" width="74" height="11" fill="#282b31" />
        <rect x="738" y="242" width="12" height="30" fill="#22252a" />
      </g>

      {/* ------------------------------- Apron ----------------------------- */}
      <path d="M0 302 L1200 290 L1200 440 L0 440 Z" fill="url(#ts-apron)" />

      {[130, 390, 650, 910, 1150].map((x) => (
        <ellipse key={x} cx={x} cy={368} rx="118" ry="36" fill="url(#ts-pool)" />
      ))}

      {Array.from({ length: 13 }).map((_, index) => (
        <path
          key={index}
          d={`M${58 + index * 92} 332 L${50 + index * 96} 406`}
          stroke="#ded9cf"
          strokeOpacity="0.13"
          strokeWidth="2.5"
        />
      ))}

      {/* ------------------------- Parked rental fleet --------------------- */}
      {[
        [95, "#41648c", "suv"],
        [292, "#8f3f38", "sedan"],
        [489, "#6f757d", "sedan"],
        [686, "#2f6b52", "suv"],
        [883, "#a8752a", "sedan"],
        [1080, "#4d4a63", "suv"],
      ].map(([x, color, shape]) => (
        <Car key={`back-${x}`} x={Number(x)} y={346} scale={0.7} color={String(color)} shape={shape as Shape} dim />
      ))}

      {[
        [30, "#b8531f", "suv"],
        [286, "#ddd7cb", "sedan"],
        [542, "#35597f", "sedan"],
        [798, "#2f6b52", "suv"],
        [1054, "#8f3f38", "sedan"],
      ].map(([x, color, shape]) => (
        <Car key={`front-${x}`} x={Number(x)} y={398} scale={1} color={String(color)} shape={shape as Shape} />
      ))}

      {/* --------------------------- Light poles --------------------------- */}
      {[130, 390, 650, 910, 1150].map((x, index) => (
        <g key={`pole-${x}`}>
          <rect x={x - 2} y={250} width="4" height="108" fill="#0e1013" />
          <path d={`M${x - 13} 248 L${x + 13} 248 L${x + 9} 242 L${x - 9} 242 Z`} fill="#1a1c20" />
          <ellipse
            className="ts-lamp"
            cx={x}
            cy={250}
            rx="8"
            ry="3.5"
            fill="#ffd98a"
            style={{ animationDelay: `${index * 0.9}s` }}
          />
        </g>
      ))}

      {/* No service lane and no moving traffic. Driving vehicles were tried
          twice and cut both times: at this scale a car crossing the frame
          reads as a sticker being dragged, and the proper fixes (suspension
          bob, spoked wheels rotating on their own axis) still didn't sell
          it. The lane itself went with them — it sat on top of the parked
          front row, and an empty road serves no purpose. */}
    </svg>
  );
}

type Shape = "sedan" | "suv";

/**
 * Three-quarter-rear silhouettes with a proper greenhouse, wheel arches
 * and a shoulder line — the previous version was a lozenge on two dots.
 */
function Car({
  x,
  y,
  scale,
  color,
  shape,
  dim = false,
}: {
  x: number;
  y: number;
  scale: number;
  color: string;
  shape: Shape;
  dim?: boolean;
}) {
  const body =
    shape === "suv"
      ? "M6 0 L6 -20 Q6 -26 14 -27 L30 -29 Q44 -44 68 -45 L92 -45 Q112 -44 122 -30 L136 -27 Q144 -25 144 -18 L144 0 Z"
      : "M4 0 L4 -16 Q4 -22 12 -24 L32 -27 Q48 -40 70 -41 L92 -41 Q110 -40 120 -27 L136 -24 Q144 -22 144 -15 L144 0 Z";

  const glass =
    shape === "suv"
      ? "M36 -30 Q48 -40 68 -41 L90 -41 Q106 -40 114 -30 Z"
      : "M40 -28 Q52 -36 70 -37 L90 -37 Q104 -36 112 -28 Z";

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={dim ? 0.55 : 1}>
      {/* contact shadow */}
      <ellipse cx="74" cy="2" rx="72" ry="6" fill="#000" opacity="0.4" />

      <path d={body} fill={color} />
      {/* shoulder highlight */}
      <path d={body} fill="#fff" opacity="0.07" transform="translate(0,-2) scale(1,0.94)" />
      <path d={glass} fill="#101318" opacity="0.72" />
      {/* pillar */}
      <rect x="74" y={shape === "suv" ? -41 : -37} width="2.5" height={shape === "suv" ? 12 : 10} fill="#101318" opacity="0.5" />

      {/* wheel arches + wheels */}
      <circle cx="34" cy="0" r="11" fill="#0e1013" />
      <circle cx="34" cy="0" r="4.5" fill="#3c4149" />
      <circle cx="114" cy="0" r="11" fill="#0e1013" />
      <circle cx="114" cy="0" r="4.5" fill="#3c4149" />

      {/* tail light */}
      <rect x="6" y="-16" width="7" height="5" rx="1.5" fill="#c1392f" opacity={dim ? 0.5 : 0.9} />
      {/* headlight */}
      <rect x="136" y="-17" width="7" height="5" rx="1.5" fill="#fff3d6" opacity={dim ? 0.45 : 0.85} />
    </g>
  );
}
