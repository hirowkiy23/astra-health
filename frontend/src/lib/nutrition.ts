import { randomUUID } from 'node:crypto';
import { getDb } from './db.ts';

export type FoodCategory = 'food' | 'drink';

export interface NutritionItem {
  name: string;
  category: FoodCategory;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  unit: string;
}

export interface MealRow {
  id: string;
  astronaut_id: string;
  item_name: string;
  category: FoodCategory;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  consumed_at: string;
}

/** Catalog of selectable food and drink items for the demo. */
export const FOOD_CATALOG: NutritionItem[] = [
  { name: 'Brisket', category: 'food', calories: 460, protein: 48, carbs: 0, fats: 28, unit: '200 g' },
  { name: 'Mac & Cheese', category: 'food', calories: 520, protein: 16, carbs: 58, fats: 22, unit: '250 g' },
  { name: 'Coffee', category: 'drink', calories: 5, protein: 0, carbs: 0, fats: 0, unit: '250 ml' },
  { name: 'Lemonade', category: 'drink', calories: 120, protein: 0, carbs: 31, fats: 0, unit: '250 ml' },
  { name: 'Mango Peach Smoothie', category: 'drink', calories: 210, protein: 3, carbs: 48, fats: 1, unit: '300 ml' },
];

export function findCatalogItem(name: string): NutritionItem | undefined {
  return FOOD_CATALOG.find(item => item.name.toLowerCase() === name.toLowerCase());
}

export interface NewMeal {
  astronautId: string;
  item: NutritionItem;
}

/** Log a consumed meal/drink with its nutritional facts. */
export function saveMeal(meal: NewMeal): string {
  const id = `MEAL-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  getDb().prepare(
    'INSERT INTO meals (id, astronaut_id, item_name, category, calories, protein, carbs, fats, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, meal.astronautId, meal.item.name, meal.item.category, meal.item.calories, meal.item.protein, meal.item.carbs, meal.item.fats, new Date().toISOString());
  return id;
}

export function listMeals(astronautId: string, limit = 50): MealRow[] {
  return getDb().prepare(
    'SELECT * FROM meals WHERE astronaut_id = ? ORDER BY consumed_at DESC, rowid DESC LIMIT ?',
  ).all(astronautId, limit) as MealRow[];
}

/** Sum protein, carbs, fats and calories over the meals since the given time. */
export function nutritionTotals(astronautId: string, sinceIso: string): { calories: number; protein: number; carbs: number; fats: number; count: number } {
  const rows = getDb().prepare(
    'SELECT calories, protein, carbs, fats FROM meals WHERE astronaut_id = ? AND consumed_at >= ?',
  ).all(astronautId, sinceIso) as { calories: number; protein: number; carbs: number; fats: number }[];
  const totals = rows.reduce((acc, r) => {
    acc.calories += r.calories;
    acc.protein += r.protein;
    acc.carbs += r.carbs;
    acc.fats += r.fats;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  return { ...totals, count: rows.length };
}
