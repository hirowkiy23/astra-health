import { NextResponse } from 'next/server';
import { FOOD_CATALOG, findCatalogItem, saveMeal, listMeals, nutritionTotals } from '@/lib/nutrition';
import { PROFILE } from '@/lib/demo-data';
import { CREW } from '@/lib/crew';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const astronautId = url.searchParams.get('astronaut_id') ?? PROFILE.id;

  const knownIds = new Set<string>([PROFILE.id, ...CREW.map((c) => c.id)]);
  if (!knownIds.has(astronautId)) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  // Totals for the current day (last 24 hours) as a simple "daily nutrition" rollup.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return NextResponse.json({
    catalog: FOOD_CATALOG,
    meals: listMeals(astronautId),
    totals_today: nutritionTotals(astronautId, since),
  });
}

export async function POST(request: Request) {
  let body: { astronaut_id?: string; item_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const astronautId = body.astronaut_id ?? PROFILE.id;
  const knownIds = new Set<string>([PROFILE.id, ...CREW.map((c) => c.id)]);
  if (!knownIds.has(astronautId)) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  if (typeof body.item_name !== 'string') {
    return NextResponse.json({ detail: 'item_name is required' }, { status: 422 });
  }

  const item = findCatalogItem(body.item_name);
  if (!item) {
    return NextResponse.json({ detail: 'Unknown food or drink item' }, { status: 422 });
  }

  const id = saveMeal({ astronautId, item });
  return NextResponse.json({ id, item }, { status: 201 });
}
