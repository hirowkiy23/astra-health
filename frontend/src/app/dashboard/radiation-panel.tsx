'use client';

import { useEffect, useState } from 'react';

type RadiationStatus = 'safe' | 'caution' | 'danger';

interface MemberRadiation {
  id: string;
  name: string;
  status: RadiationStatus;
  dose: string;
  cumulative: string;
  actions: string[];
}

// Demonstrates the three analysis result tiers with distinct members.
const DEMO_RADIATION: MemberRadiation[] = [
  {
    id: 'astro-1',
    name: 'ASTRO - 1!',
    status: 'safe',
    dose: '21 µSv/h',
    cumulative: '125.5 mSv',
    actions: ['Continue normal mission operations.'],
  },
  {
    id: 'astro-2',
    name: 'ASTRO - 2',
    status: 'caution',
    dose: '78 µSv/h',
    cumulative: '210.3 mSv',
    actions: ['Monitor radiation levels closely.'],
  },
  {
    id: 'astro-3',
    name: 'ASTRO - 3',
    status: 'danger',
    dose: '350 µSv/h',
    cumulative: '480.6 mSv',
    actions: ['Move to the designated radiation shelter and notify mission control.'],
  },
];

const STATUS_STYLE: Record<RadiationStatus, { label: string; pill: string; ring: string; dot: string; alertText: string }> = {
  safe: { label: 'Safe', pill: 'border-[#19af52] text-[#19af52]', ring: 'border-[#19af52]', dot: 'bg-[#19af52]', alertText: 'Radiation exposure is within the configured safe range.' },
  caution: { label: 'Caution', pill: 'border-[#bfb911] text-[#bfb911]', ring: 'border-[#bfb911]', dot: 'bg-[#bfb911]', alertText: 'Radiation levels are approaching the configured warning threshold.' },
  danger: { label: 'Danger', pill: 'border-[#dc0000] text-[#dc0000]', ring: 'border-[#dc0000]', dot: 'bg-[#dc0000]', alertText: 'Critical radiation exposure detected. Immediate response required.' },
};

/** Radiation exposure page: per-member status tiers and animated recommended actions. */
export default function RadiationPanel() {
  const [selectedId, setSelectedId] = useState(DEMO_RADIATION[0].id);
  const [revealed, setRevealed] = useState<string[]>([]);

  const member = DEMO_RADIATION.find(m => m.id === selectedId) ?? DEMO_RADIATION[0];

  // Stagger the recommended-action reveal for the selected member.
  useEffect(() => {
    setRevealed([]);
    const timers = member.actions.map((_, i) => setTimeout(() => {
      setRevealed(prev => [...prev, member.actions[i]]);
    }, 250 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [selectedId]);

  const style = STATUS_STYLE[member.status];

  return (
    <div className="mt-7 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <section className="flex flex-col gap-3">
        {DEMO_RADIATION.map(m => {
          const s = STATUS_STYLE[m.status];
          return (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${selectedId === m.id ? s.ring + ' bg-[#10394a]' : 'border-[#377b8c] bg-[#001c2b99] hover:bg-[#10394a]'}`}
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${s.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.name}</p>
                <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.pill}`}>{s.label}</span>
              </div>
              <span className="text-xs text-[#9fc0cd]">{m.dose}</span>
            </button>
          );
        })}
      </section>

      <section className="panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Radiation exposure · {member.name}</h2>
            <p className="mt-1 text-sm text-[#c1d9e3]">Simulated dosimetry. Space radiation is invisible and a key NASA HRP hazard.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${style.pill}`}>{style.label}</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DataCard label="Radiation Dose" value={member.dose} unit="current rate" />
          <DataCard label="Cumulative Exposure" value={member.cumulative} unit="mission total" />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Exposure Alert</h3>
          <div className={`rounded-xl border p-4 ${style.ring}`}>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${style.pill}`}>{style.label}</span>
            <p className="mt-3 text-sm leading-6 text-[#d3e7ee]">{style.alertText}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Recommended Action</h3>
          <ul className="space-y-2">
            {member.actions.map((action, i) => {
              const shown = revealed.includes(action);
              return (
                <li
                  key={action}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-500 ${shown ? 'translate-x-0 opacity-100 ' + style.ring : 'translate-x-4 opacity-0 border-transparent'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${style.pill}`}>{i + 1}</span>
                  <span className="text-sm leading-6 text-[#d3e7ee]">{action}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-6 text-xs text-[#9fc0cd]">Illustrative demo — not a clinical radiation assessment. Three tiers are shown to demonstrate distinct analysis results.</p>
      </section>
    </div>
  );
}

function DataCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-[#85b8c2] bg-[#082739] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#b1cdd8]">{label}</p>
      <p className="mt-3 text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-[#b1cdd8]">{unit}</p>
    </div>
  );
}
