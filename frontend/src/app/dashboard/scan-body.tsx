'use client';

import { useEffect, useState } from 'react';

interface Scan {
  regions: { region: string; status: 'nominal' | 'watch'; reason?: string }[];
  summary: string;
  weekKey: string;
  generatedAt: string;
}

interface ScanResponse {
  scan: Scan;
  has_scan: boolean;
  simulated: boolean;
}

// Map each scan region onto the body-figure geometry (percent coordinates,
// converted to viewBox space inside the SVG so the markers scale with it).
const REGION_SPOTS: Record<string, { x: number; y: number }> = {
  Cardiac: { x: 50, y: 34 },
  Pulmonary: { x: 50, y: 42 },
  Renal: { x: 44, y: 58 },
  Hepatic: { x: 56, y: 54 },
  Musculoskeletal: { x: 32, y: 52 },
  Neurological: { x: 50, y: 12 },
  Vascular: { x: 68, y: 52 },
  Skeletal: { x: 50, y: 74 },
  Gastrointestinal: { x: 50, y: 62 },
  Ocular: { x: 50, y: 7 },
};

const VIEW_W = 319;
const VIEW_H = 582;

/** Simulated 4D-scan body visualization. Illustrative only — not a diagnosis. */
export default function ScanBody({ astronautId }: { astronautId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [hasScan, setHasScan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Scan['regions'][number] | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/scan?astronaut_id=${encodeURIComponent(astronautId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: ScanResponse) => { setScan(d.scan); setHasScan(d.has_scan); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [astronautId]);

  return (
    <section className="panel flex min-h-[610px] flex-col items-center rounded-2xl p-5">
      <div className="flex w-full items-center justify-between">
        <h2 className="text-xl font-semibold">Body scan</h2>
        <span className="rounded-full border border-[#51ce7a] px-2 py-0.5 text-[10px] font-bold uppercase text-[#70df92]">Simulated 4D</span>
      </div>

      <div className="relative flex min-h-[500px] w-full flex-1 items-center justify-center">
        {loading ? (
          <p className="text-sm text-[#c1d9e3]">Preparing scan…</p>
        ) : scan ? (
          <BodyFigure
            regions={scan.regions}
            onSelect={setSelected}
          />
        ) : (
          <p className="text-sm text-[#c1d9e3]">No scan available.</p>
        )}
      </div>

      {scan && (
        <div className="w-full space-y-3">
          <div className="rounded-xl border border-[#398b98] bg-[#ffffff08] p-4">
            <p className="text-xs text-[#c1d9e3]">{scan.summary}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#9fc0cd]">
            <span>Week {scan.weekKey}</span>
            <span>{hasScan ? 'Based on latest recorded scan' : 'No scan recorded yet'}</span>
            <span>Illustrative output · not a diagnosis</span>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010d16]/75 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${selected.region} details`}>
          <div className="w-full max-w-sm rounded-2xl border border-[#398b98] bg-[#071e2d] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{selected.region}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${selected.status === 'watch' ? 'bg-[#c29343]/20 text-[#e7b85f]' : 'bg-[#51ce7a]/20 text-[#70df92]'}`}>
                {selected.status === 'watch' ? 'Review' : 'Nominal'}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#c1d9e3]">
              {selected.reason ?? 'This region is within the demo normal band. No simulated abnormality was flagged.'}
            </p>
            <p className="mt-4 text-xs text-[#9fc0cd]">Illustrative scan output — not a clinical finding or diagnosis.</p>
            <button onClick={() => setSelected(null)} className="mt-5 w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold text-white">Close</button>
          </div>
        </div>
      )}
    </section>
  );
}

function BodyFigure({ regions, onSelect }: { regions: Scan['regions']; onSelect: (r: Scan['regions'][number]) => void }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full max-w-[319px]"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Upright astronaut body model"
      role="img"
    >
      <g fill="#d9d9d9" fillOpacity=".1">
        <rect x="96" y="0" width="127" height="127" rx="50" />
        <rect x="74" y="140" width="170" height="214" rx="25" />
        <rect x="0" y="140" width="62" height="214" rx="25" />
        <rect x="257" y="140" width="62" height="214" rx="25" />
        <rect x="74" y="368" width="79" height="214" rx="25" />
        <rect x="166" y="368" width="79" height="214" rx="25" />
      </g>

      {/* Region markers — inside the viewBox so they scale with the figure. */}
      {regions.map(r => {
        const spot = REGION_SPOTS[r.region];
        if (!spot) return null;
        const cx = (spot.x / 100) * VIEW_W;
        const cy = (spot.y / 100) * VIEW_H;
        return (
          <g
            key={r.region}
            onClick={() => onSelect(r)}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={`${r.region} — ${r.status === 'watch' ? 'flagged for review' : 'nominal'}`}
          >
            <circle cx={cx} cy={cy} r="14" fill="transparent" />
            <circle
              cx={cx}
              cy={cy}
              r="5"
              fill={r.status === 'watch' ? '#e7b85f' : '#51ce7a'}
            />
            {r.status === 'watch' && <circle cx={cx} cy={cy} r="9" fill="none" stroke="#e7b85f" strokeOpacity=".5" />}
          </g>
        );
      })}

      {/* Height ruler, scaled inside the viewBox. */}
      <g>
        <line x1={VIEW_W - 6} y1="40" x2={VIEW_W - 6} y2="420" stroke="#8bb5c3" strokeOpacity=".7" />
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i} x1={VIEW_W - 14} y1={40 + i * 95} x2={VIEW_W - 6} y2={40 + i * 95} stroke="#8bb5c3" strokeOpacity=".7" />
        ))}
        <text x={VIEW_W - 22} y="30" fill="#c1d9e3" fontSize="11" textAnchor="end">height</text>
      </g>
    </svg>
  );
}
