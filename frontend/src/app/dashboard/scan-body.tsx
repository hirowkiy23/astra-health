'use client';

import { useEffect, useState } from 'react';

interface Scan {
  regions: { region: string; status: 'nominal' | 'watch' }[];
  summary: string;
  weekKey: string;
  generatedAt: string;
}

interface ScanResponse {
  scan: Scan;
  has_scan: boolean;
  simulated: boolean;
}

// Map each scan region onto the body-figure geometry (percent coordinates).
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

/** Simulated 4D-scan body visualization. Illustrative only — not a diagnosis. */
export default function ScanBody({ astronautId }: { astronautId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [hasScan, setHasScan] = useState(false);
  const [loading, setLoading] = useState(true);

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
          <>
            <BodyFigure />
            {scan.regions.map(r => {
              const spot = REGION_SPOTS[r.region];
              if (!spot) return null;
              return (
                <div
                  key={r.region}
                  className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${r.status === 'watch' ? 'bg-[#e7b85f] shadow-[0_0_10px_#e7b85f]' : 'bg-[#51ce7a]'}`}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  title={`${r.region}: ${r.status === 'watch' ? 'flagged for review (illustrative)' : 'nominal (illustrative)'}`}
                />
              );
            })}
            <div className="absolute right-5 top-7 h-[380px] w-16 border-r border-[#8bb5c3]/70">
              {[0, 1, 2, 3, 4].map(i => <i key={i} className="absolute right-0 block h-px w-5 bg-[#8bb5c3]/70" style={{ top: i * 95 }} />)}
              <span className="absolute -right-1 -top-6 text-xs font-semibold">height</span>
            </div>
          </>
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
    </section>
  );
}

function BodyFigure() {
  return (
    <svg width="319" height="582" viewBox="0 0 319 582" aria-label="Upright astronaut body model" role="img">
      <g fill="#d9d9d9" fillOpacity=".1">
        <rect x="96" y="0" width="127" height="127" rx="50" />
        <rect x="74" y="140" width="170" height="214" rx="25" />
        <rect x="0" y="140" width="62" height="214" rx="25" />
        <rect x="257" y="140" width="62" height="214" rx="25" />
        <rect x="74" y="368" width="79" height="214" rx="25" />
        <rect x="166" y="368" width="79" height="214" rx="25" />
      </g>
    </svg>
  );
}
