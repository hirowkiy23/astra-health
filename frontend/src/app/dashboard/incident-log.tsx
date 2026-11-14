'use client';

import { useEffect, useState } from 'react';

interface IncidentSummary {
  id: string;
  severity: 'red' | 'yellow' | 'green';
  symptoms: string;
  status: string;
  rule_id: string;
  created_at: string;
}

interface IncidentReport extends IncidentSummary {
  consultation_id: string;
  response: string;
  vitals: { heart_rate: number; spo2: number; temperature: number; blood_pressure: string; recorded_at: string; simulated: boolean } | null;
}

const SEVERITY = {
  red: 'border-[#cb5d5d] text-[#ff9f9f]',
  yellow: 'border-[#c29343] text-[#e7b85f]',
  green: 'border-[#51ce7a] text-[#70df92]',
};

/** Saved consultations with the triage result, vitals snapshot, and response used at the time. */
export default function IncidentLog({ refreshKey }: { refreshKey: number }) {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/incidents')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (Array.isArray(d)) setIncidents(d); })
      .catch(() => setError('Incident history could not be loaded.'));
  }, [refreshKey]);

  async function open(id: string) {
    if (openId === id) { setOpenId(null); setReport(null); return; }
    setOpenId(id); setReport(null);
    try {
      const r = await fetch(`/api/incidents/${id}/report`);
      if (!r.ok) throw new Error();
      setReport(await r.json());
    } catch { setError('This incident report could not be loaded.'); }
  }

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Incident log</h2>
        <span className="text-xs text-[#b2ccd8]">{incidents.length} saved</span>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-[#ffc0c0]">{error}</p>}
      {incidents.length === 0 ? (
        <p className="mt-4 text-sm text-[#bdd6e2]">No consultations have been saved yet. Reports submitted through ASTRA appear here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#2b5365]">
          {incidents.slice(0, 8).map(incident => (
            <li key={incident.id} className="py-3">
              <button onClick={() => open(incident.id)} aria-expanded={openId === incident.id} className="flex w-full items-center gap-3 text-left">
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY[incident.severity]}`}>{incident.severity}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{incident.symptoms}</span>
                  <span className="mt-0.5 block text-[11px] text-[#a9c6d3]">{incident.id} · {new Date(incident.created_at).toLocaleString()}</span>
                </span>
                <span className="text-xs text-[#9fc0cd]">{openId === incident.id ? '−' : '+'}</span>
              </button>
              {openId === incident.id && (
                <div className="mt-3 space-y-3 rounded-xl border border-[#398b98] bg-[#ffffff08] p-4">
                  {report ? (
                    <>
                      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        <Detail label="Triage rule" value={report.rule_id} />
                        <Detail label="Status" value={report.status} />
                        <Detail label="Consultation" value={report.consultation_id} />
                        <Detail label="Data" value={report.vitals?.simulated ? 'Simulated' : 'Recorded'} />
                      </dl>
                      {report.vitals && (
                        <p className="text-xs text-[#bdd6e2]">
                          Vitals at time of report: HR {report.vitals.heart_rate} bpm · SpO₂ {report.vitals.spo2}% · {report.vitals.temperature}°C · BP {report.vitals.blood_pressure} · {report.vitals.recorded_at}
                        </p>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a9c6d3]">Response recorded</p>
                        <p className="mt-1.5 text-sm leading-6 text-[#d3e7ee]">{report.response}</p>
                      </div>
                      <p className="text-[10px] text-[#9fc0cd]">Illustrative rules, not clinically validated. Not a medical device.</p>
                    </>
                  ) : <p className="text-xs text-[#bdd6e2]">Loading report…</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] uppercase tracking-wide text-[#a9c6d3]">{label}</dt><dd className="mt-1 font-semibold text-white">{value}</dd></div>;
}
