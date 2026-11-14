import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb } from '../src/lib/db.ts';
import { FOOD_CATALOG, findCatalogItem, saveMeal, listMeals, nutritionTotals } from '../src/lib/nutrition.ts';

function freshDb() {
  closeDb();
  process.env.ASTRA_DATA_DIR = mkdtempSync(join(tmpdir(), 'astra-nutrition-'));
}

test('the food catalog contains the two foods and three drinks', () => {
  const names = FOOD_CATALOG.map(item => item.name);
  assert.deepEqual(names, ['Brisket', 'Mac & Cheese', 'Coffee', 'Lemonade', 'Mango Peach Smoothie']);
  assert.equal(FOOD_CATALOG.filter(i => i.category === 'food').length, 2);
  assert.equal(FOOD_CATALOG.filter(i => i.category === 'drink').length, 3);
});

test('findCatalogItem matches case-insensitively', () => {
  assert.equal(findCatalogItem('brisket')?.protein, 48);
  assert.equal(findCatalogItem('MAC & CHEESE')?.category, 'food');
  assert.equal(findCatalogItem('does not exist'), undefined);
});

test('a logged meal is stored and read back with its facts', () => {
  freshDb();
  const item = findCatalogItem('Brisket')!;
  const id = saveMeal({ astronautId: 'demo-001', item });
  const meals = listMeals('demo-001');
  assert.equal(meals.length, 1);
  assert.equal(meals[0].id, id);
  assert.equal(meals[0].item_name, 'Brisket');
  assert.equal(meals[0].protein, 48);
});

test('nutritionTotals sums macros across meals since a timestamp', () => {
  freshDb();
  saveMeal({ astronautId: 'demo-001', item: findCatalogItem('Brisket')! });
  saveMeal({ astronautId: 'demo-001', item: findCatalogItem('Coffee')! });
  const totals = nutritionTotals('demo-001', '2020-01-01T00:00:00.000Z');
  assert.equal(totals.count, 2);
  assert.equal(totals.protein, 48);
  assert.equal(totals.calories, 465);
});
