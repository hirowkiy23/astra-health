'use client';

import { useEffect, useMemo, useState } from 'react';

interface CatalogItem {
  name: string;
  category: 'food' | 'drink';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  unit: string;
}

interface Meal {
  id: string;
  item_name: string;
  category: 'food' | 'drink';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  consumed_at: string;
}

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  count: number;
}

type View = 'summary' | 'details' | 'input';

/** Daily nutrition: summary card, details (chart + macros + recent meals), and meal input. */
export default function DailyNutrition({ astronautId }: { astronautId: string }) {
  const [view, setView] = useState<View>('summary');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);

  function refresh() {
    fetch(`/api/nutrition?astronaut_id=${encodeURIComponent(astronautId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setCatalog(d.catalog); setMeals(d.meals); setTotals(d.totals_today); })
      .catch(() => {});
  }

  useEffect(refresh, [astronautId]);

  return (
    <section className="panel rounded-2xl p-5">
      {view === 'summary' && (
        <SummaryView
          totals={totals}
          onDetails={() => setView('details')}
        />
      )}
      {view === 'details' && (
        <DetailsView
          totals={totals}
          meals={meals}
          onBack={() => setView('summary')}
          onUpdate={() => setView('input')}
        />
      )}
      {view === 'input' && (
        <InputView
          astronautId={astronautId}
          catalog={catalog}
          onBack={() => setView('details')}
          onSubmitted={() => { refresh(); setView('details'); }}
        />
      )}
    </section>
  );
}

function SummaryView({ totals, onDetails }: { totals: Totals | null; onDetails: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Daily nutrition</h2>
          <p className="mt-1 text-sm text-[#c1d9e3]">Track your daily intake of protein, carbohydrates and fats.</p>
        </div>
        <button onClick={onDetails} className="rounded-xl bg-[#0876bf] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0a69a8]">Details</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MacroStat label="Calories" value={totals ? `${totals.calories}` : '—'} unit="kcal" />
        <MacroStat label="Protein" value={totals ? `${totals.protein}` : '—'} unit="g" />
        <MacroStat label="Carbs" value={totals ? `${totals.carbs}` : '—'} unit="g" />
        <MacroStat label="Fats" value={totals ? `${totals.fats}` : '—'} unit="g" />
      </div>
    </div>
  );
}

function DetailsView({ totals, meals, onBack, onUpdate }: { totals: Totals | null; meals: Meal[]; onBack: () => void; onUpdate: () => void }) {
  const recent = useMemo(() => meals.slice(0, 6), [meals]);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Daily nutrition (details)</h2>
          <p className="mt-1 text-sm text-[#c1d9e3]">Specific intake and recent meal history.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onUpdate} className="rounded-xl bg-[#0876bf] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0a69a8]">Update meal information</button>
          <button onClick={onBack} className="rounded-xl border border-[#398b98] px-4 py-2.5 text-sm font-bold text-[#d0e9f1]">Back</button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Macro intake today</h3>
          <MacroChart totals={totals} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MacroStat label="Protein" value={totals ? `${totals.protein}` : '—'} unit="g" />
            <MacroStat label="Carbs" value={totals ? `${totals.carbs}` : '—'} unit="g" />
            <MacroStat label="Fats" value={totals ? `${totals.fats}` : '—'} unit="g" />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Recent meals</h3>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-[#398b98] bg-[#ffffff08] p-4 text-sm text-[#c1d9e3]">No meals logged yet. Use “Update meal information” to add one.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map(meal => (
                <li key={meal.id} className="flex items-center justify-between rounded-xl border border-[#398b98] bg-[#ffffff08] p-3">
                  <div>
                    <p className="font-semibold">{meal.item_name}</p>
                    <p className="text-xs text-[#9fc0cd]">{new Date(meal.consumed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meal.category}</p>
                  </div>
                  <p className="text-sm font-bold text-[#c1d9e3]">{meal.calories} kcal</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function InputView({ astronautId, catalog, onBack, onSubmitted }: { astronautId: string; catalog: CatalogItem[]; onBack: () => void; onSubmitted: () => void }) {
  const foods = catalog.filter(i => i.category === 'food');
  const drinks = catalog.filter(i => i.category === 'drink');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function pick(item: CatalogItem) {
    setSelected(item);
    setExpanded(false);
    // Trigger the dropdown animation for the chosen item's facts.
    requestAnimationFrame(() => setExpanded(true));
  }

  async function submit() {
    if (!selected) { setError('Select a food or drink item first.'); return; }
    setSubmitting(true); setError('');
    try {
      const r = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ astronaut_id: astronautId, item_name: selected.name }),
      });
      if (!r.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError('Your meal could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Daily nutrition input</h2>
          <p className="mt-1 text-sm text-[#c1d9e3]">Pick a food or drink to log its nutritional facts.</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-[#398b98] px-4 py-2.5 text-sm font-bold text-[#d0e9f1]">Back</button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Food</h3>
          <div className="space-y-2">
            {foods.map(item => (
              <ItemButton key={item.name} item={item} active={selected?.name === item.name} onClick={() => pick(item)} />
            ))}
          </div>
          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Drinks</h3>
          <div className="space-y-2">
            {drinks.map(item => (
              <ItemButton key={item.name} item={item} active={selected?.name === item.name} onClick={() => pick(item)} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#a9c6d3]">Nutritional facts</h3>
          <div className={`overflow-hidden rounded-xl border transition-all duration-500 ease-in-out ${expanded && selected ? 'max-h-96 border-[#6ac2d0] opacity-100' : 'max-h-0 border-transparent opacity-0'}`}>
            {selected && (
              <div className="bg-[#082739] p-5">
                <p className="text-lg font-bold">{selected.name}</p>
                <p className="text-xs text-[#9fc0cd]">Serving {selected.unit}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <FactRow label="Calories" value={`${selected.calories} kcal`} />
                  <FactRow label="Protein" value={`${selected.protein} g`} />
                  <FactRow label="Carbohydrates" value={`${selected.carbs} g`} />
                  <FactRow label="Fats" value={`${selected.fats} g`} />
                </div>
              </div>
            )}
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-[#ffc0c0]">{error}</p>}

          <button onClick={submit} disabled={submitting || !selected} className="mt-5 w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold text-white transition hover:bg-[#0a69a8] disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010d16]/75 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Status submitted">
          <div className="w-full max-w-sm rounded-2xl border border-[#51ce7a] bg-[#071e2d] p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#51ce7a] text-2xl text-[#70df92]">✓</div>
            <h3 className="mt-4 text-xl font-bold text-white">Status submitted</h3>
            <p className="mt-2 text-sm text-[#c1d9e3]">Your meal information was saved successfully.</p>
            <button onClick={onSubmitted} className="mt-5 w-full rounded-xl bg-[#0876bf] px-5 py-3 font-bold text-white">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemButton({ item, active, onClick }: { item: CatalogItem; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${active ? 'border-[#6ac2d0] bg-[#6ac2d0]/20' : 'border-[#398b98] bg-[#ffffff08] hover:border-[#9edce8]'}`}>
      <span className="font-semibold">{item.name}</span>
      <span className="text-xs text-[#9fc0cd]">{item.calories} kcal · {item.unit}</span>
    </button>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#1c4a5c] pb-2 last:border-0">
      <span className="text-[#c1d9e3]">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function MacroStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-[#398b98] bg-[#ffffff08] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#a9c6d3]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}<span className="ml-1 text-xs font-semibold text-[#bad1dd]">{unit}</span></p>
    </div>
  );
}

function MacroChart({ totals }: { totals: Totals | null }) {
  // Dummy chart: stacked bar of protein / carbs / fats as a percentage of total grams.
  const protein = totals?.protein ?? 0;
  const carbs = totals?.carbs ?? 0;
  const fats = totals?.fats ?? 0;
  const total = protein + carbs + fats;
  const pct = (n: number) => total > 0 ? `${(n / total) * 100}%` : '0%';
  return (
    <div className="rounded-xl border border-[#398b98] bg-[#082739] p-5">
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-[#010d16]">
        <div style={{ width: pct(protein) }} className="bg-[#6ac2d0]" title={`Protein ${protein}g`} />
        <div style={{ width: pct(carbs) }} className="bg-[#e7b85f]" title={`Carbs ${carbs}g`} />
        <div style={{ width: pct(fats) }} className="bg-[#f47d7d]" title={`Fats ${fats}g`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#c1d9e3]">
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm bg-[#6ac2d0]" /> Protein {protein}g</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm bg-[#e7b85f]" /> Carbs {carbs}g</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm bg-[#f47d7d]" /> Fats {fats}g</span>
      </div>
    </div>
  );
}
