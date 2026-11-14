'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Tab = 'Overview' | 'Physiological' | 'Radiation' | 'Daily' | 'Fitness';
type Crew = { id: string; name: string; status: 'Good' | 'Review' | 'Critical'; weight: number; vitals: { heartRate: number; bloodPressure: string; temperature: number; spo2: number }; environment: { oxygen: number; carbonDioxide: number; temperature: number; pressure: number; humidity: number } };
type Reference = { id: string; title: string; section: string; source: string; url: string };
type Result = { response: { message: string; warning_signs: string[]; recommended_actions: string[]; mode: string }; triage: { level: 'red' | 'yellow' | 'green'; reason: string }; references: Reference[]; incident_id: string };
type Turn = { role: 'user' | 'assistant'; text: string; result?: Result };
type SosStatus = 'idle' | 'sending' | 'response' | 'resolved';

const TABS: Tab[] = ['Overview', 'Physiological', 'Radiation', 'Daily', 'Fitness'];
const DEFAULT_CREW: Crew[] = [
  { id: 'astro-1', name: 'ASTRO - 1!', status: 'Good', weight: 67, vitals: { heartRate: 68, bloodPressure: '118/76', temperature: 36.7, spo2: 98 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-2', name: 'ASTRO - 2', status: 'Good', weight: 71, vitals: { heartRate: 65, bloodPressure: '116/74', temperature: 36.5, spo2: 99 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-3', name: 'ASTRO - 3', status: 'Review', weight: 63, vitals: { heartRate: 74, bloodPressure: '121/78', temperature: 36.9, spo2: 97 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-4', name: 'ASTRO - 4', status: 'Good', weight: 69, vitals: { heartRate: 69, bloodPressure: '119/75', temperature: 36.6, spo2: 98 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
  { id: 'astro-5', name: 'ASTRO - 5', status: 'Good', weight: 66, vitals: { heartRate: 66, bloodPressure: '115/73', temperature: 36.5, spo2: 99 }, environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 } },
];

export default function Dashboard() {
  const router = useRouter();
  const [crew, setCrew] = useState(DEFAULT_CREW);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<Tab>('Overview');
  const [sos, setSos] = useState<SosStatus>('idle');
  const [consultOpen, setConsultOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [incidentCount, setIncidentCount] = useState(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  const astronaut = crew[selected];

  useEffect(() => {
    document.title = 'ASTRA — Mission health';
    fetch('/api/crew').then(r => r.json()).then(d => { if (d.crew?.length) setCrew(d.crew); }).catch(() => {});
    fetch('/api/incidents').then(r => r.json()).then(d => { if (Array.isArray(d)) setIncidentCount(d.length); }).catch(() => {});
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, consultOpen]);

  async function consult(event: React.FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setMessage(''); setBusy(true); setError('');
    setTurns(t => [...t, { role: 'user', text }]);
    try {
      const r = await fetch('/api/consultation/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astronaut_id: 'demo-001', message: text }) });
      if (!r.ok) throw new Error();
      const result: Result = await r.json();
      setTurns(t => [...t, { role: 'assistant', text: result.response.message, result }]);
      setIncidentCount(c => c + 1);
    } catch { setError('Consultation could not be completed. No assessment was produced.'); }
    finally { setBusy(false); }
  }

  async function triggerSos() {
    if (sos !== 'idle') return;
    setSos('sending'); setError('');
    try {
      const r = await fetch('/api/consultation/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ astronaut_id: 'demo-001', message: 'SOS: I have severe chest pain and trouble breathing. Emergency assistance requested.' }) });
      if (!r.ok) throw new Error();
      await r.json();
      setSos('response');
      setIncidentCount(c => c + 1);
    } catch { setSos('idle'); setError('SOS request failed. Use the spacecraft emergency procedure immediately.'); }
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
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full border border-[#79a0ae]/50 bg-white/10"><UserIcon size={43} /></div>
          <div><p className="text-2xl">Hello,</p><h1 className="text-2xl font-bold">{astronaut.name}</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <nav aria-label="Health sections" className="flex flex-wrap gap-3">
            {TABS.map(t => <button key={t} onClick={() => { setTab(t); setSos('idle'); }} className={`h-12 rounded-full border px-6 text-[15px] font-extrabold transition ${tab === t ? 'border-[#2989cb] bg-[#0568bb] shadow-[0_0_18px_#0c85cf40]' : 'border-[#2e566b] bg-[#031a2c]/80 hover:bg-[#0b3045]'}`}>{t}</button>)}
          </nav>
          <Link href="/login" className="ml-2 text-xs text-[#9ac3d1] underline-offset-4 hover:underline">Sign out</Link>
        </div>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#b0ccd7]">
        <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#55d98b]" />ARES-01 · Mission day 127</p>
        <p>SIMULATED CREW DATA · {incidentCount} logged incidents</p>
      </div>

      {error && <div role="alert" className="mt-5 rounded-xl border border-[#ff9595] bg-[#671d24]/80 p-4 text-sm">{error}</div>}

      {sos !== 'idle' ? (
        <section className="mt-7 grid gap-6 lg:grid-cols-2">
          <Panel title="Latest Update"><div className="grid gap-4 sm:grid-cols-2">{metrics.map(([label, value, unit]) => <VitalCard key={label} label={label} value={value} unit={unit} />)}</div><p className="mt-6 rounded-lg border border-[#b84e4e] bg-[#7a2424]/25 px-4 py-3 text-sm font-semibold text-[#ffcece]">SOS incident logged · Emergency assistance required</p></Panel>
          <Panel title="Status"><div className="space-y-4"><StatusRow tag="Signal Received" text="ASTRO-2 is responding and heading to the location." /><StatusRow tag="Signal Received" text="ASTRO-3 is responding and heading to the location." /><StatusRow tag="Data Transmitted" text="Medical data has been sent to the Earth Medical Team." muted /></div></Panel>
          <Panel title="Possible Causes" className="lg:col-span-2"><div className="flex flex-col justify-between gap-8 md:flex-row"><div><h2 className="text-2xl font-bold">Emergency assessment required</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#b4d3de]">An illustrative emergency rule matched. This is not a diagnosis. Follow the approved spacecraft emergency procedure; do not wait for further AI assessment.</p><ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-[#d0e6ed]"><li>Activate the applicable approved mission emergency procedure.</li><li>Contact the crew medical officer or ground medical support.</li><li>Use only approved protocols and trained human assistance.</li></ul></div><div className="flex shrink-0 flex-col gap-3"><button onClick={() => setSos('resolved')} className="rounded-xl bg-[#e5ebee] px-12 py-4 text-sm font-extrabold text-[#142d3c]">{sos === 'resolved' ? 'Acknowledged' : 'Acknowledge'}</button><button onClick={() => setSos('idle')} className="rounded-xl border border-[#5f99ae] px-12 py-3 text-sm">Return to overview</button></div></div></Panel>
        </section>
      ) : tab === 'Overview' ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <section className="flex flex-col rounded-2xl border border-[#397d91] bg-[#001524]/25 p-4">
            <div className="space-y-3">{crew.slice(1).map((a, i) => <button key={a.id} onClick={() => setSelected(i + 1)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${selected === i + 1 ? 'border-[#68bfcd] bg-[#164355]/70' : 'border-[#377b8c] bg-[#071e2c]/35 hover:bg-[#123849]/50'}`}><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10"><UserIcon /></div><div><p className="text-lg font-bold">{a.name}</p><StatusPill status={a.status} /></div></button>)}</div>
            <button onClick={triggerSos} className="mt-5 flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-[#9b3636] bg-[#6e171b]/80 text-6xl font-extrabold tracking-[.16em] transition hover:bg-[#8e242a] focus:outline-none focus:ring-4 focus:ring-[#f09292]/60">SOS<span className="mt-1 text-xl tracking-[.4em]">•••</span></button>
          </section>
          <BodyPanel astronaut={astronaut} />
          <Panel title="Environmental Monitoring"><div className="space-y-3">{[['Oxygen', astronaut.environment.oxygen, '%'], ['Carbon Dioxide', astronaut.environment.carbonDioxide, '%'], ['Temperature', astronaut.environment.temperature, '°C'], ['Pressure', astronaut.environment.pressure, 'kPa'], ['Humidity', astronaut.environment.humidity, '%']].map(([label, value, unit]) => <EnvironmentCard key={String(label)} label={String(label)} value={String(value)} unit={String(unit)} />)}</div></Panel>
        </div>
      ) : tab === 'Physiological' ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]"><BodyPanel astronaut={astronaut} physiological /><div className="grid gap-6"><Panel title="Latest Update"><div className="grid grid-cols-2 gap-3">{metrics.map(([label, value, unit]) => <VitalCard key={label} label={label} value={value} unit={unit} />)}</div></Panel><Panel title="Health Consultation"><p className="mb-5 text-sm leading-6 text-[#b4d3de]">Report a symptom for independent triage and source-grounded guidance.</p><button onClick={() => setConsultOpen(true)} className="w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold">Open ASTRA consultation</button></Panel></div></div>
      ) : <EmptyTab tab={tab} onConsult={() => setConsultOpen(true)} />}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#91b4c3]"><p>ASTRA · Decision-support prototype · Not a medical device</p><button onClick={() => setConsultOpen(true)} className="rounded-full border border-[#44869c] px-5 py-2 font-semibold text-[#d2e9f0]">Ask ASTRA about a concern →</button></div>

      {consultOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#010d16]/75 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="ASTRA consultation"><section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#43869a] bg-[#071e2d] shadow-2xl"><div className="flex items-center justify-between border-b border-[#2d5365] p-5"><div><h2 className="text-xl font-bold">Consult ASTRA</h2><p className="mt-1 text-xs text-[#a3c4d1]">Triage is independent of AI · Every response is logged</p></div><button onClick={() => setConsultOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[#508499]" aria-label="Close consultation">✕</button></div><div className="min-h-[240px] flex-1 space-y-4 overflow-y-auto p-5">{turns.length === 0 && <p className="text-sm leading-6 text-[#b3ceda]">Describe a health concern. This prototype provides decision support, not a diagnosis.</p>}{turns.map((t, i) => <div key={i}>{t.role === 'user' ? <p className="ml-auto max-w-[85%] rounded-xl bg-[#0a5a90] px-4 py-3 text-sm">{t.text}</p> : <div className="space-y-3"><div className={`rounded-xl border p-4 text-sm ${t.result?.triage.level === 'red' ? 'border-[#cb5d5d] bg-[#6a2024]/50' : t.result?.triage.level === 'yellow' ? 'border-[#c29343] bg-[#715221]/35' : 'border-[#448f6a] bg-[#1a553e]/35'}`}><b>TRIAGE · {t.result?.triage.level.toUpperCase()}</b><p className="mt-2 text-[#d2e4eb]">{t.result?.triage.reason}</p></div><p className="text-sm leading-6">{t.text}</p>{t.result?.response.recommended_actions.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-[#c3dce5]">{t.result.response.recommended_actions.map(a => <li key={a}>{a}</li>)}</ul> : null}{t.result?.references.map(r => <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-[#375d70] p-3 text-xs text-[#83c8ed]">{r.title} · {r.source}</a>)}</div>}</div>)}{busy && <p className="text-sm text-[#a5c5d2]">Running deterministic triage and retrieving references…</p>}<div ref={chatEnd} /></div><form onSubmit={consult} className="border-t border-[#2d5365] p-4"><div className="flex gap-3"><textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Describe your symptoms or concern…" className="flex-1 resize-none rounded-xl border border-[#47788c] bg-[#0a293c] p-3 text-sm outline-none focus:border-[#7abacf]" /><button disabled={busy || !message.trim()} className="self-end rounded-xl bg-[#0b75b6] px-6 py-3 font-bold disabled:opacity-40">Send</button></div><p className="mt-2 text-[10px] text-[#8baebf]">Synthetic data · Illustrative rules · {turns.at(-1)?.result?.response.mode.replace('_', ' ') || 'Decision support only'}</p></form></section></div>}
    </main>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-2xl border border-[#397d91] bg-[#001524]/25 p-5 ${className}`}><h2 className="mb-5 text-xl font-semibold">{title}</h2>{children}</section>; }
function UserIcon({ size = 34 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="10" r="5.5" fill="#a7b8bf" /><path d="M5 27c0-7 4.5-10 11-10s11 3 11 10" fill="#a7b8bf" /></svg>; }
function StatusPill({ status }: { status: string }) { const color = status === 'Good' ? 'border-[#51ce7a] text-[#70df92]' : status === 'Review' ? 'border-[#e7b85f] text-[#e7b85f]' : 'border-[#f47d7d] text-[#f47d7d]'; return <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${color}`}>{status}</span>; }
function BodyPanel({ astronaut, physiological = false }: { astronaut: Crew; physiological?: boolean }) { return <section className="flex min-h-[610px] flex-col items-center rounded-2xl border border-[#397d91] bg-[#001524]/20 p-5"><div className="relative flex min-h-[500px] w-full flex-1 items-center justify-center"><BodyFigure highlight={physiological} /><div className="absolute right-5 top-7 h-[380px] w-16 border-r border-[#8bb5c3]/70">{[0, 1, 2, 3, 4].map(i => <i key={i} className="absolute right-0 block h-px w-5 bg-[#8bb5c3]/70" style={{ top: i * 95 }} />)}<span className="absolute -right-1 -top-6 text-xs font-semibold">height</span></div><div className="absolute bottom-4 h-16 w-72 rounded-[50%] border border-[#4b99ab]" /></div><p className="mt-4 text-sm font-semibold">weight = {astronaut.weight}kg</p></section>; }
function BodyFigure({ highlight }: { highlight: boolean }) { return <div className="relative h-[430px] w-[200px] opacity-80"><div className="absolute left-[76px] top-0 h-[80px] w-[80px] rounded-full bg-[#49718b]" /><div className="absolute left-[60px] top-[92px] h-[165px] w-[90px] rounded-[35px] bg-[#49718b]" /><div className="absolute left-[19px] top-[100px] h-[180px] w-[30px] rounded-[20px] bg-[#49718b]" /><div className="absolute right-[10px] top-[100px] h-[180px] w-[30px] rounded-[20px] bg-[#49718b]" /><div className="absolute left-[58px] top-[245px] h-[183px] w-[40px] rounded-[22px] bg-[#49718b]" /><div className="absolute right-[55px] top-[245px] h-[183px] w-[40px] rounded-[22px] bg-[#49718b]" />{highlight && <div className="absolute left-[88px] top-[116px] h-12 w-12 rounded-full border-2 border-[#59d78b] shadow-[0_0_15px_#51d18150]" />}</div>; }
function VitalCard({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="rounded-xl border border-[#397d91] bg-[#031b2b]/30 p-4"><p className="text-sm font-medium">{label}</p><div className="mt-3 flex items-end justify-between gap-2"><p className="text-2xl font-extrabold">{value}<span className="ml-1 text-xs font-semibold text-[#9abecb]">{unit}</span></p><StatusPill status="Good" /></div></div>; }
function EnvironmentCard({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="rounded-xl border border-[#397d91] p-4"><p className="text-sm">{label}</p><div className="mt-2 flex items-end justify-between gap-2"><p className="text-3xl font-extrabold">{value}<span className="ml-1 text-xs text-[#a6c2ce]">{unit}</span></p><StatusPill status="Good" /></div></div>; }
function StatusRow({ tag, text, muted = false }: { tag: string; text: string; muted?: boolean }) { return <div className="rounded-xl border border-[#397d91] p-4"><span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${muted ? 'border-white/70 text-white' : 'border-[#51ce7a] text-[#70df92]'}`}>{tag}</span><p className="mt-3 text-sm leading-6 text-[#c5dfe8]">{text}</p></div>; }
function EmptyTab({ tab, onConsult }: { tab: Tab; onConsult: () => void }) { return <section className="mt-7 grid min-h-[600px] place-items-center rounded-2xl border border-[#397d91] bg-[#001524]/20 p-8 text-center"><div><p className="text-sm uppercase tracking-[.25em] text-[#75a9bd]">Mission module</p><h2 className="mt-3 text-4xl font-bold">{tab}</h2><p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[#a8c8d5]">This section is not yet designed in the Figma source. The frame contains navigation only; no monitoring data is being implied.</p><button onClick={onConsult} className="mt-7 rounded-full border border-[#5c9fb5] px-6 py-3 text-sm font-semibold">Open ASTRA consultation</button></div></section>; }
