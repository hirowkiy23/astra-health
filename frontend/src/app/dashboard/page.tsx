'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import IncidentLog from './incident-log';
import DailyCheckIn from './daily-check-in';
import ScanBody from './scan-body';
import RadiationPanel from './radiation-panel';
import BodyFigure from './body-figure';
import { getSessionAstronautId } from '@/lib/auth';

type Tab = 'Overview' | 'Physiological' | 'Radiation' | 'Daily' | 'Fitness' | 'Environment' | 'AI Risk';
type Crew = { id: string; name: string; status: 'Good' | 'Review' | 'Critical'; weight: number; vitals: { heartRate: number; bloodPressure: string; temperature: number; spo2: number }; environment: { oxygen: number; carbonDioxide: number; temperature: number; pressure: number; humidity: number } };
type Reference = { id: string; title: string; section: string; source: string; url: string };
type Result = { response: { message: string; warning_signs: string[]; recommended_actions: string[]; mode: string }; triage: { level: 'red' | 'yellow' | 'green'; reason: string }; references: Reference[]; incident_id: string; consultation_id: string };
type Turn = { role: 'user' | 'assistant'; text: string; result?: Result; timestamp?: string };
type SosStatus = 'idle' | 'sending' | 'response' | 'resolved';

const TABS: Tab[] = ['Overview', 'Physiological', 'Radiation', 'Daily', 'Fitness', 'Environment', 'AI Risk'];
const DEFAULT_CREW: Crew[] = [
  { id: 'astro-1', name: 'ASTRO - 1!', status: 'Good', weight: 67, vitals: { heartRate: 68, bloodPressure: '118/76', temperature: 36.7, spo2: 98 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-2', name: 'ASTRO - 2', status: 'Good', weight: 71, vitals: { heartRate: 65, bloodPressure: '116/74', temperature: 36.5, spo2: 99 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-3', name: 'ASTRO - 3', status: 'Review', weight: 63, vitals: { heartRate: 74, bloodPressure: '121/78', temperature: 36.9, spo2: 97 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-4', name: 'ASTRO - 4', status: 'Good', weight: 69, vitals: { heartRate: 69, bloodPressure: '119/75', temperature: 36.6, spo2: 98 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-5', name: 'ASTRO - 5', status: 'Good', weight: 66, vitals: { heartRate: 66, bloodPressure: '115/73', temperature: 36.5, spo2: 99 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
];

export default function Dashboard() {
  const [crew, setCrew] = useState(DEFAULT_CREW);
  const currentId = getSessionAstronautId();
  const [selected, setSelected] = useState(() => Math.max(0, DEFAULT_CREW.findIndex(c => c.id === currentId)));
  const [tab, setTab] = useState<Tab>('Overview');
  const [sos, setSos] = useState<SosStatus>('idle');
  const [sosCount, setSosCount] = useState(0);
  const [consultOpen, setConsultOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState('Searching the NASA knowledge base');
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [incidentCount, setIncidentCount] = useState(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  // The logged-in astronaut (fixed identity for the whole dashboard).
  const current = crew.find(c => c.id === currentId) ?? crew[0];
  // The astronaut whose health summaries are currently being viewed.
  const astronaut = crew[selected];

  useEffect(() => {
    document.title = 'ASTRA — Mission health';
    fetch('/api/seed').catch(() => {});
    fetch('/api/crew').then(r => r.json()).then(d => { if (d.crew?.length) setCrew(d.crew); }).catch(() => {});
    fetch('/api/incidents').then(r => r.json()).then(d => { if (Array.isArray(d)) setIncidentCount(d.length); }).catch(() => {});
    const saved = localStorage.getItem('astra-consultation-id');
    if (saved) {
      fetch(`/api/consultation/history?consultation_id=${encodeURIComponent(saved)}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => { if (Array.isArray(d.turns)) { setConsultationId(saved); setTurns(d.turns); } })
        .catch(() => { localStorage.removeItem('astra-consultation-id'); setConsultationId(null); });
    }
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, consultOpen, busy]);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setThinking('ASTRA is thinking and preparing a grounded answer'), 900);
    return () => clearTimeout(timer);
  }, [busy]);

  async function consult(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setMessage(''); setBusy(true); setError('');
    setThinking('Searching the NASA knowledge base');
    setTurns(t => [...t, { role: 'user', text }]);
    try {
      const r = await fetch('/api/consultation/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astronaut_id: astronaut.id, message: text, consultation_id: consultationId, vitals: { heart_rate: astronaut.vitals.heartRate, spo2: astronaut.vitals.spo2, temperature: astronaut.vitals.temperature, blood_pressure: astronaut.vitals.bloodPressure } }) });
      if (!r.ok) throw new Error();
      const result: Result = await r.json();
      setConsultationId(result.consultation_id);
      localStorage.setItem('astra-consultation-id', result.consultation_id);
      setTurns(t => [...t, { role: 'assistant', text: result.response.message, result }]);
      setIncidentCount(c => c + 1);
    } catch { setError('Consultation could not be completed. No assessment was produced.'); }
    finally { setBusy(false); }
  }

  async function triggerSos() {
    if (sos !== 'idle') return;
    setSos('sending'); setError('');
    try {
      const r = await fetch('/api/consultation/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astronaut_id: current.id, message: 'SOS: I have severe chest pain and trouble breathing. Emergency assistance requested.' }) });
      if (!r.ok) throw new Error();
      await r.json();
      setSos('response');
      setIncidentCount(c => c + 1);
    } catch { setSos('idle'); setSosCount(0); setError('SOS request failed. Use the spacecraft emergency procedure immediately.'); }
  }

  const metrics = [
    ['Heart Rate', `${astronaut.vitals.heartRate}`, 'bpm'],
    ['Blood Pressure', astronaut.vitals.bloodPressure, 'mmHg'],
    ['Body Temperature', `${astronaut.vitals.temperature}`, '°C'],
    ['Blood Oxygen Level', `${astronaut.vitals.spo2}`, '%'],
  ];

  return (
    <main className="mission-bg min-h-screen px-6 py-7 text-white md:px-10 lg:px-[80px] lg:py-[41px]">
      <header className="flex flex-col justify-between gap-7 xl:flex-row xl:items-center">
        <div className="flex items-center gap-5">
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full border border-[#79a0ae]/50 bg-[#082739]/10"><UserIcon size={43} /></div>
          <div><p className="text-2xl">Hello,</p><h1 className="text-2xl font-bold">{current.name}</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <nav aria-label="Health sections" className="flex flex-wrap gap-3">
            {TABS.map(t => <button key={t} onClick={() => { setTab(t); setSos('idle'); }} className={`h-12 rounded-full border px-6 text-[15px] font-extrabold transition ${tab === t ? 'border-[#2989cb] bg-[#0568bb] shadow-[0_0_18px_#0c85cf40]' : 'border-[#2e566b] bg-[#082739] hover:bg-[#d5ebed]'}`}>{t}</button>)}
          </nav>
          <Link href="/login" className="ml-2 text-xs text-[#c0dce5] underline-offset-4 hover:underline">Sign out</Link>
        </div>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#bdd6e2]">
        <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#55d98b]" />ARES-01 · Mission day 127</p>
        <p>SIMULATED CREW DATA · {incidentCount} logged incidents</p>
      </div>

      {error && <div role="alert" className="mt-5 rounded-xl border border-[#ff9595] bg-[#671d24]/80 p-4 text-sm">{error}</div>}

      {sos !== 'idle' ? (
        <section className="mt-7 grid gap-6 lg:grid-cols-2">
          <Panel title="Latest Update"><div className="grid gap-4 sm:grid-cols-2">{metrics.map(([label, value, unit]) => <VitalCard key={label} label={label} value={value} unit={unit} />)}</div><p className="mt-6 rounded-lg border border-[#b84e4e] bg-[#7a2424]/25 px-4 py-3 text-sm font-semibold text-[#ffcece]">SOS incident logged · Emergency assistance required</p></Panel>
          <Panel title="Status"><div className="space-y-4"><StatusRow tag="Signal Received" text="ASTRO-2 is responding and heading to the location." /><StatusRow tag="Signal Received" text="ASTRO-3 is responding and heading to the location." /><StatusRow tag="Data Transmitted" text="Medical data has been sent to the Earth Medical Team." muted /></div></Panel>
          <Panel title="Possible Causes" className="lg:col-span-2"><div className="flex flex-col justify-between gap-8 md:flex-row"><div><h2 className="text-2xl font-bold">Emergency assessment required</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#c1d9e3]">An illustrative emergency rule matched. This is not a diagnosis. Follow the approved spacecraft emergency procedure; do not wait for further AI assessment.</p><ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-[#d3e7ee]"><li>Activate the applicable approved mission emergency procedure.</li><li>Contact the crew medical officer or ground medical support.</li><li>Use only approved protocols and trained human assistance.</li></ul></div><div className="flex shrink-0 flex-col gap-3"><button onClick={() => { setSos('resolved'); setSosCount(0); }} className="rounded-xl bg-[#e5ebee] px-12 py-4 text-sm font-extrabold text-[#142d3c]">{sos === 'resolved' ? 'Acknowledged' : 'Acknowledge'}</button><button onClick={() => { setSos('idle'); setSosCount(0); }} className="rounded-xl border border-[#5f99ae] px-12 py-3 text-sm">Return to overview</button></div></div></Panel>
        </section>
      ) : tab === 'Overview' ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <section className="flex flex-col rounded-2xl border border-[#397d91] panel p-4">
            <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#9fc0cd]">Crew — view health summaries</p>
            <div className="space-y-3">{crew.map((a, i) => <button key={a.id} onClick={() => setSelected(i)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${selected === i ? 'border-[#68bfcd] bg-[#10394a]' : 'border-[#377b8c] bg-[#001c2b99] hover:bg-[#10394a]'}`}><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#082739]/10"><UserIcon /></div><div><p className="text-lg font-bold">{a.name}{a.id === currentId && <span className="ml-2 text-[10px] font-semibold text-[#6ac2d0]">YOU</span>}</p><StatusPill status={a.status} /></div></button>)}</div>
            <button onClick={() => { const next = sosCount + 1; setSosCount(next); if (next >= 3) void triggerSos(); }} aria-label={`SOS emergency activation: press ${Math.max(0, 3 - sosCount)} more times`} className="mt-5 flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-[#9b3636] bg-[#6e171b] text-6xl font-extrabold tracking-[.16em] text-white transition hover:bg-[#8e242a] focus:outline-none focus:ring-4 focus:ring-[#b64949]/30">{sosCount > 0 ? `${sosCount}/3` : 'SOS'}<span className="mt-1 max-w-[230px] text-xs font-semibold tracking-normal text-[#ffe4e4]">{sosCount === 0 ? 'Press 3 times for emergency' : `Press ${3 - sosCount} more ${3 - sosCount === 1 ? 'time' : 'times'}`}</span></button>
          </section>
          <ScanBody astronautId={astronaut.id} />
          <Panel title="Environmental Monitoring"><div className="mb-4 rounded-lg border border-[#85b8c2] bg-[#082739] p-3 text-xs leading-5 text-[#c1d9e3]"><b className="text-[#e8f4f7]">Supported environments</b><p>Cabin · EVA · Lunar · Mars</p></div><div className="space-y-3">{[['Oxygen', astronaut.environment.oxygen, '%'], ['Carbon Dioxide', astronaut.environment.carbonDioxide, '%'], ['Temperature', astronaut.environment.temperature, '°C'], ['Pressure', astronaut.environment.pressure, 'kPa'], ['Humidity', astronaut.environment.humidity, '%']].map(([label, value, unit]) => <EnvironmentCard key={String(label)} label={String(label)} value={String(value)} unit={String(unit)} />)}</div><button onClick={() => setTab('Environment')} className="mt-4 w-full rounded-lg border border-[#398b98] py-2 text-xs font-bold text-[#d0e9f1]">Multi-environment view →</button></Panel>
        </div>
      ) : tab === 'Physiological' ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]"><BodyPanel astronaut={astronaut} physiological /><div className="grid gap-6"><Panel title="Latest Update"><div className="grid grid-cols-2 gap-3">{metrics.map(([label, value, unit]) => <VitalCard key={label} label={label} value={value} unit={unit} />)}</div></Panel><Panel title="Health Alert"><div className="rounded-xl border border-[#51ce7a] bg-[#1a553e]/35 p-4"><span className="rounded-full border border-[#51ce7a] px-3 py-1 text-xs font-bold text-[#70df92]">NORMAL</span><p className="mt-3 text-sm leading-6 text-[#d3e7ee]">All Health Indicators Are Normal.</p></div></Panel><Panel title="Health Consultation"><p className="mb-5 text-sm leading-6 text-[#c1d9e3]">Report a symptom for independent triage and source-grounded guidance.</p><button onClick={() => setConsultOpen(true)} className="w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold">Open ASTRA consultation</button></Panel></div></div>
      ) : tab === 'AI Risk' ? (
        <div className="mt-7 space-y-6">
          <FeatureTab tab={tab} astronautId={astronaut.id} onConsult={() => setConsultOpen(true)} />
          <IncidentLog refreshKey={incidentCount} />
        </div>
      ) : <FeatureTab tab={tab} astronautId={astronaut.id} onConsult={() => setConsultOpen(true)} />}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#b2ccd8]"><p>ASTRA · Decision-support prototype · Not a medical device</p><button onClick={() => setConsultOpen(true)} className="rounded-full border border-[#44869c] px-5 py-2 font-semibold text-[#d2eaf1]">Ask ASTRA about a concern →</button></div>

      {consultOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#010d16]/75 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="ASTRA consultation"><section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#398b98] bg-[#071e2d] shadow-2xl"><div className="flex items-center justify-between border-b border-[#86b5bf] p-5"><div><h2 className="text-xl font-bold">Consult ASTRA</h2><p className="mt-1 text-xs text-[#c1d9e3]">Ask questions or report incidents · Sources shown with each answer</p></div><button onClick={() => setConsultOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[#508499]" aria-label="Close consultation">✕</button></div><div className="min-h-[240px] flex-1 space-y-4 overflow-y-auto p-5">{turns.length === 0 && <div className="rounded-xl border border-[#398b98] bg-[#ffffff08] p-4"><p className="text-sm leading-6 text-[#d3e7ee]">Ask about spaceflight health, or describe an incident to log it and get an independent triage result.</p><div className="mt-4 flex flex-wrap gap-2">{['What are the risks of space radiation?', 'I feel dizzy after the gravity transition', 'What does NASA research say about sleep?'].map(q => <button key={q} onClick={() => setMessage(q)} className="rounded-full border border-[#47788c] px-3 py-1.5 text-xs text-[#c1d9e3] hover:bg-[#ffffff10]">{q}</button>)}</div></div>}{turns.map((t, i) => <div key={i}>{t.role === 'user' ? <p className="ml-auto max-w-[85%] rounded-xl bg-[#0a5a90] px-4 py-3 text-sm">{t.text}</p> : <div className="space-y-3">{t.result?.triage?.level ? <div className={`rounded-xl border p-4 text-sm ${t.result.triage.level === 'red' ? 'border-[#cb5d5d] bg-[#6a2024]/50' : t.result.triage.level === 'yellow' ? 'border-[#c29343] bg-[#715221]/35' : 'border-[#448f6a] bg-[#1a553e]/35'}`}><b>TRIAGE · {t.result.triage.level.toUpperCase()}</b><p className="mt-2 text-[#d3e7ee]">{t.result.triage.reason}</p></div> : null}<p className="text-sm leading-6">{t.text}</p>{t.result?.response.recommended_actions.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-[#d3e7ee]">{t.result.response.recommended_actions.map(a => <li key={a}>{a}</li>)}</ul> : null}{t.result?.references.map(r => <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-[#375d70] p-3 text-xs text-[#8fd5ef]">{r.title} · {r.source}</a>)}</div>}</div>)}{busy && <div className="rounded-xl border border-[#398b98] bg-[#10394a] p-4" role="status" aria-live="polite"><div className="flex items-center gap-3"><div className="thinking-orbit" aria-hidden="true"><i /><i /><i /></div><div><p className="text-sm font-semibold text-white">{thinking}<span className="thinking-dots" aria-hidden="true">...</span></p><p className="mt-1 text-xs text-[#bdd6e2]">The answer will appear here when processing is complete.</p></div></div></div>}<div ref={chatEnd} /></div><form onSubmit={consult} className="border-t border-[#86b5bf] p-4"><div className="flex gap-3"><textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Ask a question or report an incident…" className="flex-1 resize-none rounded-xl border border-[#47788c] bg-[#082739] p-3 text-sm text-white outline-none placeholder:text-[#a7c4d2] focus:border-[#7abacf]" /><button disabled={busy || !message.trim()} className="self-end rounded-xl bg-[#0b75b6] px-6 py-3 font-bold disabled:opacity-40">Send</button></div><p className="mt-2 text-[10px] text-[#acc8d4]">Synthetic data · Illustrative rules · {turns.at(-1)?.result?.response.mode.replace('_', ' ') || 'Decision support only'}</p></form></section></div>}
    </main>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-2xl border border-[#397d91] panel p-5 ${className}`}><h2 className="mb-5 text-xl font-semibold">{title}</h2>{children}</section>; }
function UserIcon({ size = 34 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="10" r="5.5" fill="#a7b8bf" /><path d="M5 27c0-7 4.5-10 11-10s11 3 11 10" fill="#a7b8bf" /></svg>; }
function StatusPill({ status }: { status: string }) { const color = status === 'Good' ? 'border-[#51ce7a] text-[#70df92]' : status === 'Review' ? 'border-[#e7b85f] text-[#e7b85f]' : 'border-[#f47d7d] text-[#f47d7d]'; return <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${color}`}>{status}</span>; }
function BodyPanel({ astronaut, physiological = false }: { astronaut: Crew; physiological?: boolean }) { return <section className="flex min-h-[660px] flex-col items-center rounded-2xl border border-[#397d91] panel p-5"><div className="relative flex min-h-[560px] w-full flex-1 items-center justify-center"><BodyFigure highlight={physiological} className="max-w-[300px]" /><div className="absolute right-5 top-7 h-[440px] w-16 border-r border-[#8bb5c3]/70">{[0, 1, 2, 3, 4, 5].map(i => <i key={i} className="absolute right-0 block h-px w-5 bg-[#8bb5c3]/70" style={{ top: i * 88 }} />)}<span className="absolute -right-1 -top-6 text-xs font-semibold">height</span></div><div className="absolute bottom-4 h-16 w-72 rounded-[50%] border border-[#4b99ab]" /></div><p className="mt-4 text-sm font-semibold">weight = {astronaut.weight}kg</p></section>; }

function VitalCard({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="rounded-xl border border-[#397d91] panel-muted p-4"><p className="text-sm font-medium">{label}</p><div className="mt-3 flex items-end justify-between gap-2"><p className="text-2xl font-extrabold">{value}<span className="ml-1 text-xs font-semibold text-[#bad1dd]">{unit}</span></p><StatusPill status="Good" /></div></div>; }
function EnvironmentCard({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="rounded-xl border border-[#397d91] p-4"><p className="text-sm">{label}</p><div className="mt-2 flex items-end justify-between gap-2"><p className="text-3xl font-extrabold">{value}<span className="ml-1 text-xs text-[#bad1dd]">{unit}</span></p><StatusPill status="Good" /></div></div>; }
function StatusRow({ tag, text, muted = false }: { tag: string; text: string; muted?: boolean }) { return <div className="rounded-xl border border-[#397d91] p-4"><span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${muted ? 'border-white/70 text-white' : 'border-[#51ce7a] text-[#70df92]'}`}>{tag}</span><p className="mt-3 text-sm leading-6 text-[#d3e7ee]">{text}</p></div>; }
function FeatureTab({ tab, astronautId, onConsult }: { tab: Tab; astronautId: string; onConsult: () => void }) {
  if (tab === 'Environment') return <div className="mt-7 space-y-6"><Panel title="Supported Environments"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[['Spacecraft cabin','Nominal','20.9% O₂ · 0.04% CO₂ · 101.2 kPa','Temperature, pressure, lighting, noise and microbial monitoring'],['EVA suit','Preparation','Suit telemetry pending','Pressure, oxygen, CO₂ and decompression exposure context'],['Lunar surface','Simulated','1/6 Earth gravity','Gravity transitions, gait and sensorimotor assessment'],['Mars transit','Simulated','0g transit profile','Radiation, isolation and closed-environment monitoring']].map(([name,status,data,description]) => <div key={name} className="rounded-xl border border-[#398b98] bg-[#082739] p-5"><h3 className="text-lg font-bold">{name}</h3><span className="mt-3 inline-block rounded-full border border-[#51ce7a] px-2 py-1 text-[10px] font-bold text-[#70df92]">{status}</span><p className="mt-4 text-sm font-semibold">{data}</p><p className="mt-2 text-xs leading-5 text-[#c1d9e3]">{description}</p></div>)}</div></Panel><div className="grid gap-6 lg:grid-cols-2"><Panel title="Cross-Environment Context"><p className="text-sm leading-6 text-[#c1d9e3]">Health observations should be evaluated with the environment in which they were collected. A cabin, suit, lunar surface and deep-space transit have different hazards and measurement constraints.</p><MiniChart /></Panel><Panel title="Hostile/Closed Environments"><p className="text-sm leading-6 text-[#c1d9e3]">NASA identifies temperature, pressure, lighting, noise, microbial communities and immune responses as important habitability factors. Environmental context belongs on the same timeline as symptoms.</p><button onClick={onConsult} className="mt-6 rounded-xl bg-[#0876bf] px-5 py-3 text-sm font-bold text-white">Ask ASTRA about environment risks</button></Panel></div></div>;
  if (tab === 'AI Risk') return <div className="mt-7 grid gap-6 lg:grid-cols-2"><Panel title="AI Health Risk Assessment"><div className="rounded-xl border border-[#398b98] bg-[#082739] p-5"><span className="rounded-full border border-[#51ce7a] px-3 py-1 text-xs font-bold text-[#70df92]">GREEN · ILLUSTRATIVE</span><h3 className="mt-4 text-2xl font-bold">No escalation rule matched</h3><p className="mt-3 text-sm leading-6 text-[#c1d9e3]">This does not rule out a medical concern. Independent deterministic triage remains separate from model-generated explanations.</p></div><div className="mt-4 grid grid-cols-2 gap-4"><DataCard label="Rules evaluated" value="3" unit="illustrative demo rules" /><DataCard label="Source coverage" value="27" unit="NASA HRP summaries" /></div></Panel><Panel title="Assessment Approach"><div className="space-y-3"><FeatureInfo title="1 · Retrieve" text="Match relevant NASA Human Research Program hazards, risks and ongoing investigations." /><FeatureInfo title="2 · Triage" text="Evaluate red, yellow or green independently of the language model." /><FeatureInfo title="3 · Explain" text="Generate a source-grounded explanation, then enforce escalation rules in code." /><FeatureInfo title="4 · Log" text="Save the concern, urgency and response as a reviewable incident." /></div></Panel><Panel title="Start an Assessment" className="lg:col-span-2"><p className="text-sm leading-6 text-[#c1d9e3]">ASTRA provides decision support, not diagnosis or treatment. If retrieval finds no useful reference, it says so rather than inventing an answer.</p><button onClick={onConsult} className="mt-5 rounded-xl bg-[#0876bf] px-5 py-3 text-sm font-bold text-white">Open ASTRA consultation</button></Panel></div>;
  if (tab === 'Radiation') return <RadiationPanel />;
  if (tab === 'Daily') return <DailyCheckIn astronautId={astronautId} />;
  return <div className="mt-7 grid gap-6 lg:grid-cols-2"><Panel title="Physical Fitness"><div className="grid grid-cols-2 gap-4"><DataCard label="Fitness Frequency" value="6 / 7" unit="days this week" /><DataCard label="Weekly Duration" value="107 / 90" unit="minutes" /><DataCard label="Goal" value="Achieved" unit="weekly target" /><DataCard label="Treadmill session" value="Pending" unit="16:00 UTC" /></div></Panel><Panel title="Performance Trend"><MiniChart /><p className="mt-5 text-sm leading-6 text-[#c1d9e3]">Exercise countermeasures support bone, muscle and cardiorespiratory fitness during spaceflight. Individual response should be reviewed in context.</p></Panel><Panel title="NASA HRP Context" className="lg:col-span-2"><div className="grid gap-4 md:grid-cols-3"><FeatureInfo title="Reduced fitness" text="Monitor exercise type, dose, performance and recovery without a single opaque health score." /><FeatureInfo title="Bone changes" text="Microgravity can contribute to bone loss. Imaging and laboratory assessment may be needed." /><FeatureInfo title="Zero T2" text="NASA studied exercise without a treadmill to inform future deep-space missions." /></div></Panel></div>;
}
function DataCard({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="rounded-xl border border-[#85b8c2] bg-[#082739] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#b1cdd8]">{label}</p><p className="mt-3 text-2xl font-extrabold text-white">{value}</p><p className="mt-1 text-[11px] text-[#b1cdd8]">{unit}</p></div>; }
function FeatureInfo({ title, text, href }: { title: string; text: string; href?: string }) { const content = <><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#c1d9e3]">{text}</p></>; return href ? <a href={href} target="_blank" rel="noreferrer" className="rounded-xl border border-[#85b8c2] bg-[#082739] p-5 hover:bg-[#e5f5f5]">{content}</a> : <div className="rounded-xl border border-[#85b8c2] bg-[#082739] p-5">{content}</div>; }
function MiniChart() { return <svg viewBox="0 0 500 150" className="mt-5 h-36 w-full rounded-xl border border-[#85b8c2] bg-[#082739]" role="img" aria-label="Illustrative seven-day trend"><path d="M25 120 H475 M25 80 H475 M25 40 H475" stroke="#c6dde1" /><polyline points="35,60 105,68 175,55 245,82 315,74 385,93 455,88" fill="none" stroke="#277f8f" strokeWidth="3" /><path d="M35 60 105 68 175 55 245 82 315 74 385 93 455 88" fill="none" /><text x="35" y="140" fill="#426571" fontSize="11">7 days ago</text><text x="410" y="140" fill="#426571" fontSize="11">Today · demo</text></svg>; }
