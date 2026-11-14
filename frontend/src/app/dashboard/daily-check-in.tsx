'use client';

import { useEffect, useState } from 'react';
import DailyNutrition from './daily-nutrition';

interface DailyLogState {
  logs: { id: string; kind: 'daily' | 'ultrasound'; mood: number | null; note: string | null; created_at: string }[];
  ultrasound_due: boolean;
  latest_ultrasound: { created_at: string } | null;
  weekly_summary: WeeklySummary;
}

interface WeeklySummary {
  weekKey: string;
  range: { start: string; end: string };
  checkInCount: number;
  averageMood: number | null;
  moodTrend: 'up' | 'down' | 'flat';
  ultrasoundCount: number;
  latestUltrasound: string | null;
  flaggedRegions: string[];
}

const MOODS = [
  ['😞', 'Very low', 1],
  ['😕', 'Low', 2],
  ['😐', 'Okay', 3],
  ['🙂', 'Good', 4],
  ['😄', 'Excellent', 5],
] as const;

/** Daily mood/sleep check-in with submit + success popup, plus a weekly ultrasound reminder. */
export default function DailyCheckIn({ astronautId }: { astronautId: string }) {
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<DailyLogState>({ logs: [], ultrasound_due: true, latest_ultrasound: null, weekly_summary: null as unknown as WeeklySummary });

  useEffect(() => {
    fetch(`/api/daily-logs?astronaut_id=${encodeURIComponent(astronautId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setState(d))
      .catch(() => {});
  }, [astronautId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mood === null) { setError('Select a mood before submitting.'); return; }
    setSubmitting(true); setError('');
    try {
      const r = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ astronaut_id: astronautId, kind: 'daily', mood, note: note.trim() || null }),
      });
      if (!r.ok) throw new Error();
      setSubmitted(true);
      setNote('');
      setMood(null);
      const refreshed = await fetch(`/api/daily-logs?astronaut_id=${encodeURIComponent(astronautId)}`).then(r => r.json());
      setState(refreshed);
    } catch {
      setError('Your check-in could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="panel rounded-2xl p-5">
        <h2 className="text-xl font-semibold">Daily well-being check-in</h2>
        <p className="mt-2 text-sm leading-6 text-[#c1d9e3]">Record mood and rest to track your own longitudinal pattern. Private individual input.</p>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#a9c6d3]">How are you feeling today?</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Mood">
              {MOODS.map(([emoji, label, value]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mood === value}
                  onClick={() => { setMood(value); setError(''); }}
                  className={`h-12 w-12 rounded-full border text-2xl transition ${mood === value ? 'border-[#6ac2d0] bg-[#6ac2d0]/20' : 'border-[#398b98] bg-[#ffffff0d] hover:border-[#9edce8]'}`}
                  title={label}
                  aria-label={`Mood: ${label}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {mood !== null && <p className="mt-2 text-xs text-[#70df92]">Selected: {MOODS[mood - 1][1]}</p>}
          </div>

          <div>
            <label htmlFor="daily-note" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#a9c6d3]">Note (optional)</label>
            <textarea id="daily-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Anything affecting your sleep or mood today…" className="min-h-24 w-full rounded-xl border border-[#78aeb9] bg-[#082739] p-3 text-sm text-white placeholder:text-[#a7c4d2] outline-none focus:border-[#7abacf]" />
          </div>

          {error && <p role="alert" className="text-sm text-[#ffc0c0]">{error}</p>}

          <button type="submit" disabled={submitting || mood === null} className="w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold text-white transition hover:bg-[#0a69a8] disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? 'Submitting…' : 'Submit check-in'}
          </button>
          <p className="text-xs text-[#9fc0cd]">Crew-wide views must not expose these notes.</p>
        </form>
      </section>

      <div className="lg:col-span-2">
        <DailyNutrition astronautId={astronautId} />
      </div>

      <section className="panel rounded-2xl p-5">
        <h2 className="text-xl font-semibold">Weekly ultrasound scan</h2>
        <p className="mt-2 text-sm leading-6 text-[#c1d9e3]">A scheduled full-body scan informs the 4D body model on the overview. Completing it keeps your health picture current.</p>

        <div className={`mt-5 rounded-xl border p-5 ${state.ultrasound_due ? 'border-[#c29343] bg-[#c29343]/10' : 'border-[#51ce7a] bg-[#51ce7a]/10'}`}>
          {state.ultrasound_due ? (
            <>
              <p className="text-lg font-bold text-[#e7b85f]">Scan due</p>
              <p className="mt-2 text-sm leading-6 text-[#c1d9e3]">Your weekly ultrasound scan has not been recorded in the last 7 days. Visit the medical bay to complete it.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[#70df92]">Scan up to date</p>
              <p className="mt-2 text-sm leading-6 text-[#c1d9e3]">Last recorded {state.latest_ultrasound ? new Date(state.latest_ultrasound.created_at).toLocaleDateString() : ''}. Next scan in under a week.</p>
            </>
          )}
        </div>

        <button
          onClick={() => {
            fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ astronaut_id: astronautId }),
            }).then(r => r.ok ? r.json() : Promise.reject())
              .then(() => fetch(`/api/daily-logs?astronaut_id=${encodeURIComponent(astronautId)}`).then(r => r.json()))
              .then(setState)
              .catch(() => setError('The scan record could not be saved.'));
          }}
          className="mt-5 w-full rounded-xl border border-[#398b98] px-5 py-3 font-bold text-[#d0e9f1] transition hover:bg-[#ffffff10]"
        >
          Mark scan completed (demo)
        </button>
        <p className="mt-3 text-xs text-[#9fc0cd]">Simulated action — no real ultrasound device is connected.</p>
      </section>

      <section className="panel rounded-2xl p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Weekly summary</h2>
          {state.weekly_summary && <span className="rounded-full border border-[#398b98] px-2 py-0.5 text-[10px] font-bold uppercase text-[#9fc0cd]">Week {state.weekly_summary.weekKey}</span>}
        </div>

        {!state.weekly_summary ? (
          <p className="mt-3 text-sm text-[#c1d9e3]">Loading this week's summary…</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Check-ins" value={String(state.weekly_summary.checkInCount)} sub="this week" />
            <SummaryStat
              label="Average mood"
              value={state.weekly_summary.averageMood !== null ? `${state.weekly_summary.averageMood} / 5` : '—'}
              sub={state.weekly_summary.averageMood !== null ? moodLabel(state.weekly_summary.averageMood) : 'no check-ins yet'}
            />
            <SummaryStat
              label="Mood trend"
              value={{ up: '↗', down: '↘', flat: '→' }[state.weekly_summary.moodTrend]}
              sub={state.weekly_summary.moodTrend}
            />
            <SummaryStat
              label="Ultrasound scans"
              value={String(state.weekly_summary.ultrasoundCount)}
              sub={state.weekly_summary.latestUltrasound ? `last ${new Date(state.weekly_summary.latestUltrasound).toLocaleDateString()}` : 'none recorded'}
            />
          </div>
        )}

        {state.weekly_summary && (
          <div className="mt-5 rounded-xl border border-[#398b98] bg-[#ffffff08] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a9c6d3]">Flagged scan regions this week</p>
            {state.weekly_summary.flaggedRegions.length === 0 ? (
              <p className="mt-2 text-sm text-[#c1d9e3]">No regions flagged. Illustrative scan output only — not a clinical finding.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {state.weekly_summary.flaggedRegions.map(region => (
                  <span key={region} className="rounded-full border border-[#c29343] bg-[#c29343]/15 px-3 py-1 text-xs font-semibold text-[#e7b85f]">{region}</span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-[#9fc0cd]">Illustrative scan output — not a clinical finding or diagnosis.</p>
          </div>
        )}
      </section>

      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010d16]/75 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Check-in submitted">
          <div className="w-full max-w-sm rounded-2xl border border-[#51ce7a] bg-[#071e2d] p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#51ce7a] text-2xl text-[#70df92]">✓</div>
            <h3 className="mt-4 text-xl font-bold text-white">Check-in submitted</h3>
            <p className="mt-2 text-sm text-[#c1d9e3]">Your daily well-being log was saved successfully.</p>
            <button onClick={() => setSubmitted(false)} className="mt-5 w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold text-white">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[#398b98] bg-[#ffffff08] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#a9c6d3]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-[#9fc0cd]">{sub}</p>
    </div>
  );
}

function moodLabel(mood: number): string {
  const labels = ['Very low', 'Low', 'Okay', 'Good', 'Excellent'];
  return labels[Math.min(4, Math.max(0, Math.round(mood) - 1))];
}
