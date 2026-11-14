'use client';

import { useEffect, useRef, useState } from 'react';

type Vitals = { heart_rate: number; spo2: number; temperature: number; blood_pressure: string; recorded_at: string; simulated: boolean };
type Profile = { id: string; name: string; role: string; mission: string; mission_day: number; allergies: string[]; medical_history: string; baseline: string };
type Reference = { id: string; title: string; section: string; source: string; url: string; text: string };
type Triage = { level: 'red' | 'yellow' | 'green'; reason: string; requires_human_support: boolean; rule_id: string; validated: boolean };
type AssistantResponse = { message: string; warning_signs: string[]; recommended_actions: string[]; requires_human_support: boolean; mode: string };
type Result = { response: AssistantResponse; triage: Triage; references: Reference[]; incident_id: string };
type Incident = { id: string; severity: string; symptoms: string; status: string; created_at: string };
type Turn = { role: 'user' | 'assistant'; content: string; result?: Result };

const API = '';
const COLORS = { red: '#cf4c58', yellow: '#c78320', green: '#1e9b73' };

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  async function refreshIncidents() {
    const response = await fetch(`${API}/api/incidents`);
    if (response.ok) setIncidents(await response.json());
  }

  useEffect(() => {
    Promise.all([fetch(`${API}/api/health/summary`), fetch(`${API}/api/incidents`)])
      .then(async ([summary, list]) => {
        if (!summary.ok) throw new Error('Backend unavailable');
        const data = await summary.json();
        setProfile(data.astronaut);
        setVitals(data.vitals);
        if (list.ok) setIncidents(await list.json());
      })
      .catch(() => setError('ASTRA is unavailable. Check the server logs and reload.'));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns]);

  async function consult(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setError('');
    setBusy(true);
    setMessage('');
    setTurns(current => [...current, { role: 'user', content: text }]);
    try {
      const response = await fetch(`${API}/api/consultation/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ astronaut_id: 'demo-001', message: text }),
      });
      if (!response.ok) throw new Error('Consultation request failed');
      const result: Result = await response.json();
      setTurns(current => [...current, { role: 'assistant', content: result.response.message, result }]);
      await refreshIncidents();
    } catch {
      setError('The consultation did not complete. No medical assessment was produced. Use the applicable approved procedure or contact human medical support.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-[#14263b]">
      <header className="sticky top-0 z-20 border-b border-[#dfe7ef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-serif text-lg font-bold tracking-tight">ASTRA</div>
              <div className="text-[10px] uppercase tracking-[.16em] text-[#6e8093]">Space medical decision support</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#62768a]">
            <span className="hidden items-center gap-2 sm:flex"><i className="h-1.5 w-1.5 rounded-full bg-[#1e9b73]" />Demo environment</span>
            <span className="rounded-full border border-[#e5b96f] bg-[#fff8e9] px-3 py-1 font-medium text-[#8d641c]">SIMULATED DATA</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-6 px-5 py-7 lg:grid-cols-[1.35fr_1fr] lg:px-8">
        <div className="space-y-6">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6c8094]">{profile ? `${profile.mission} · Mission day ${profile.mission_day}` : 'CONNECTING…'}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight md:text-4xl">Crew health, in context.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#64788c]">A grounded, mission-aware assistant for assessing concerns when human medical support may be delayed.</p>
          </section>

          {error && <div role="alert" className="rounded-xl border border-[#e8c7c7] bg-[#fff4f4] px-4 py-3 text-sm text-[#9b3f47]">{error}</div>}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e1e9f0] bg-white p-5 shadow-[0_10px_30px_-24px_#14263b]">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e7eefb] text-sm font-bold text-[#295cb3]">AM</div>
                <div><h2 className="font-semibold">{profile?.name ?? 'Loading profile'}</h2><p className="text-xs text-[#708396]">{profile?.role ?? '—'}</p></div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div><dt className="text-[#8293a4]">Baseline</dt><dd className="mt-1 font-medium">{profile?.baseline ?? '—'}</dd></div>
                <div><dt className="text-[#8293a4]">Allergies</dt><dd className="mt-1 font-medium">{profile?.allergies.join(', ') ?? '—'}</dd></div>
              </dl>
            </div>
            <div className="rounded-2xl border border-[#e1e9f0] bg-white p-5">
              <div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#61768a]">Latest readings</h2><span className="text-[10px] text-[#8a9aab]">08:14 UTC</span></div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Reading label="Heart rate" value={vitals ? String(vitals.heart_rate) : '—'} unit="bpm" />
                <Reading label="SpO₂" value={vitals ? String(vitals.spo2) : '—'} unit="%" />
                <Reading label="Temperature" value={vitals ? String(vitals.temperature) : '—'} unit="°C" />
                <Reading label="Blood pressure" value={vitals?.blood_pressure ?? '—'} unit="mmHg" />
              </div>
            </div>
          </section>

          <section className="flex items-start gap-3 rounded-xl border border-[#dce7f1] bg-[#eef5fb] px-4 py-3 text-xs leading-5 text-[#526b81]">
            <span className="mt-0.5 text-[#4c7cad]">ⓘ</span>
            <p><b className="text-[#355573]">Safety notice:</b> ASTRA is a prototype. It cannot diagnose or treat. Deterministic triage rules shown here are illustrative and not clinically validated; they never replace approved mission procedures or human medical judgment.</p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg font-bold">Health incidents</h2><span className="text-xs text-[#73869a]">{incidents.length} recorded</span></div>
            <div className="overflow-hidden rounded-2xl border border-[#e1e9f0] bg-white">
              {incidents.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[#7c8da0]">No incidents recorded. Submit a concern in the consultation panel to create one.</p>
              ) : incidents.slice(0, 5).map(incident => (
                <div key={incident.id} className="flex items-center gap-3 border-b border-[#edf2f6] px-5 py-4 last:border-0">
                  <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[incident.severity as keyof typeof COLORS] }} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{incident.symptoms}</p><p className="mt-0.5 text-[11px] text-[#8293a4]">{incident.id} · {new Date(incident.created_at).toLocaleString()}</p></div>
                  <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5f7488]">{incident.severity}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[#dce5ee] bg-white shadow-[0_20px_60px_-35px_#14263b]">
          <div className="border-b border-[#e5edf4] px-5 py-4">
            <div className="flex items-center justify-between"><h2 className="font-serif text-lg font-bold">Consult ASTRA</h2><span className="rounded-full bg-[#eef7f2] px-2.5 py-1 text-[10px] font-semibold text-[#237659]">Triage independent of AI</span></div>
            <p className="mt-1 text-xs text-[#75889b]">Describe a health concern. Every response is logged.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfcfe] px-4 py-5">
            {turns.length === 0 && (
              <div className="rounded-xl border border-[#e4ebf2] bg-white p-4">
                <p className="text-sm font-medium">Start with a concern</p>
                <p className="mt-1 text-xs leading-5 text-[#75889b]">Example: “I’ve felt dizzy since the gravity transition.”</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['I feel dizzy after the gravity transition', 'I have a headache and feel tired', 'I have severe chest pain and trouble breathing'].map(example => (
                    <button key={example} onClick={() => setMessage(example)} className="rounded-full border border-[#dce5ee] px-3 py-1.5 text-left text-[11px] text-[#4e657b] transition hover:border-[#a9c0d5] hover:bg-[#f5f9fc]">{example}</button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn, index) => turn.role === 'user' ? (
              <div key={index} className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-[#1b334d] px-4 py-3 text-sm leading-6 text-white">{turn.content}</div>
            ) : (
              <div key={index} className="space-y-3">
                {turn.result && <TriageBanner triage={turn.result.triage} />}
                <div className="max-w-[94%] rounded-2xl rounded-bl-sm border border-[#e2eaf2] bg-white px-4 py-3 text-sm leading-6">{turn.content}</div>
                {turn.result && <AssistantDetails result={turn.result} />}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-[#6f8498]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3d76bd]" />Running deterministic triage and retrieval…</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={consult} className="border-t border-[#e5edf4] bg-white p-4">
            <div className="flex gap-2">
              <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); consult(e); } }} rows={2} maxLength={4000} placeholder="Describe your symptoms or concern…" className="min-h-[48px] flex-1 resize-none rounded-xl border border-[#d8e2ec] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[#98a8b8] focus:border-[#6d9ccb] focus:ring-2 focus:ring-[#cfe1f2]" aria-label="Consultation message" />
              <button disabled={busy || !message.trim()} className="self-end rounded-xl bg-[#235b9c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b4b83] disabled:cursor-not-allowed disabled:opacity-40">{busy ? '…' : 'Send'}</button>
            </div>
            <p className="mt-2 text-[10px] text-[#8b9bab]">Prototype only · Demo responses use synthetic data and illustrative rules</p>
          </form>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1500px] flex-wrap justify-between gap-2 px-5 pb-7 text-[10px] text-[#8293a4] lg:px-8"><span>ASTRA · Decision support prototype, not a medical device</span><span>Sources: NASA Human Research Program · Synthetic patient record</span></footer>
    </div>
  );
}

function Logo() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="8" fill="none" stroke="#2d6fb5" strokeWidth="2" /><circle cx="16" cy="16" r="3" fill="#2d6fb5" /><ellipse cx="16" cy="16" rx="14" ry="5" fill="none" stroke="#67b7c1" strokeWidth="1.5" transform="rotate(-32 16 16)" /></svg>;
}

function Reading({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-[#8496a7]">{label}</p><p className="mt-1 font-serif text-xl font-bold">{value} <span className="font-sans text-[10px] font-normal text-[#8799aa]">{unit}</span></p></div>;
}

function TriageBanner({ triage }: { triage: Triage }) {
  const color = COLORS[triage.level];
  return (
    <div className="rounded-xl border px-3.5 py-3" style={{ borderColor: `${color}55`, background: `${color}0d` }}>
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.15em]" style={{ color }}>Triage · {triage.level}</span><span className="text-[9px] uppercase tracking-wide text-[#8395a6]">{triage.rule_id}</span></div>
      <p className="mt-1.5 text-xs leading-5 text-[#4f657a]">{triage.reason}</p>
      {triage.requires_human_support && <p className="mt-2 text-[11px] font-semibold" style={{ color }}>Human medical support required</p>}
    </div>
  );
}

function AssistantDetails({ result }: { result: Result }) {
  return (
    <div className="space-y-2 pl-1">
      {result.response.recommended_actions.length > 0 && <div className="rounded-lg border border-[#e4ebf2] bg-white px-3.5 py-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#708396]">Next steps</p><ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#52687d]">{result.response.recommended_actions.map(a => <li key={a} className="flex gap-2"><span className="text-[#7197b8]">›</span>{a}</li>)}</ul></div>}
      {result.references.length > 0 ? <div className="rounded-lg border border-[#e4ebf2] bg-white px-3.5 py-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#708396]">Grounded references</p>{result.references.map(ref => <a key={ref.id} href={ref.url} target="_blank" rel="noreferrer" className="mt-2 block rounded-md bg-[#f6f9fc] px-2.5 py-2 transition hover:bg-[#edf4fa]"><span className="block text-xs font-semibold text-[#2d5e8f]">{ref.title}</span><span className="mt-0.5 block text-[10px] text-[#7d8fa1]">{ref.source} · {ref.section}</span></a>)}</div> : <div className="rounded-lg border border-dashed border-[#dbe4ed] px-3.5 py-2.5 text-[11px] text-[#7d8fa1]">No matching demo reference was found. ASTRA did not invent one.</div>}
      <div className="flex items-center justify-between text-[9px] uppercase tracking-wide text-[#95a5b4]"><span>Incident {result.incident_id}</span><span>{result.response.mode.replace('_', ' ')}</span></div>
    </div>
  );
}
