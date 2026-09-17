// Inline SVG icons ported from the fetched Iconify/lucide set (design/assets/icons/).
// Inlined rather than <img> so they inherit currentColor and carry no extra requests.
// One set, one stroke weight (1.75) — per style lock.

const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 16, children }) {
  return (
    <svg
      className="ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...P}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  chevronLeft: (p) => (
    <Svg {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  dashboard: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Svg>
  ),
  megaphone: (p) => (
    <Svg {...p}>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </Svg>
  ),
  music: (p) => (
    <Svg {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  ),
  store: (p) => (
    <Svg {...p}>
      <path d="m2 7 1-4h18l1 4" />
      <path d="M2 7h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V7z" />
      <path d="M4 12v9h16v-9" />
    </Svg>
  ),
  sparkles: (p) => (
    <Svg {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </Svg>
  ),
  download: (p) => (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </Svg>
  ),
  image: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21" />
    </Svg>
  ),
  message: (p) => (
    <Svg {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  ),
  trending: (p) => (
    <Svg {...p}>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </Svg>
  ),
  search: (p) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  ),
  chart: (p) => (
    <Svg {...p}>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="1" />
      <rect x="12" y="8" width="3" height="10" rx="1" />
      <rect x="17" y="4" width="3" height="14" rx="1" />
    </Svg>
  ),
  bookmark: (p) => (
    <Svg {...p}>
      <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </Svg>
  ),
  filter: (p) => (
    <Svg {...p}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
    </Svg>
  ),
  globe: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
    </Svg>
  ),
  package: (p) => (
    <Svg {...p}>
      <path d="m12 2 9 5v10l-9 5-9-5V7z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </Svg>
  ),
  alert: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </Svg>
  ),
  sun: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  ),
  moon: (p) => (
    <Svg {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  ),
  play: (p) => (
    <Svg {...p}>
      <path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />
    </Svg>
  ),
  link: (p) => (
    <Svg {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  ),
  close: (p) => (
    <Svg {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  ),
  expand: (p) => (
    <Svg {...p}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </Svg>
  ),
  shrink: (p) => (
    <Svg {...p}>
      <path d="M9 3v6H3M15 21v-6h6M21 3l-6 6M3 21l6-6" />
    </Svg>
  ),
  user: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  ),
  lock: (p) => (
    <Svg {...p}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Svg>
  ),
  shield: (p) => (
    <Svg {...p}>
      <path d="M12 2.6 20 6v6c0 4.6-3.4 8.4-8 9.4-4.6-1-8-4.8-8-9.4V6z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  document: (p) => (
    <Svg {...p}>
      <path d="M14 2.8H7a2 2 0 0 0-2 2v14.4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.8z" />
      <path d="M14 2.8V8h5" />
      <path d="M9 13h6M9 17h4" />
    </Svg>
  ),
  logout: (p) => (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  ),
};

// Brand mark: two offset bars reading as a rising signal, inside a hexagonal aperture.
// Geometric, recognizable at 16px, built from the locked palette — not a letter in a box.
export function BrandMark({ size = 22 }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 1.6 21.2 7v10L12 22.4 2.8 17V7z"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect
        x="8"
        y="12.5"
        width="2.6"
        height="5.5"
        rx="1"
        fill="var(--primary)"
      />
      <rect
        x="13.4"
        y="6"
        width="2.6"
        height="12"
        rx="1"
        fill="var(--accent)"
      />
    </svg>
  );
}
