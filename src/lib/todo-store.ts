import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ITodoItem } from '@/types/todo';

const TODOS_FILE = path.join(os.homedir(), '.purplemux', 'todos.json');

export const readTodos = async (): Promise<ITodoItem[]> => {
  try {
    const raw = await fs.readFile(TODOS_FILE, 'utf-8');
    return JSON.parse(raw) as ITodoItem[];
  } catch {
    return [];
  }
};

const writeTodos = async (todos: ITodoItem[]): Promise<void> => {
  const tmpFile = TODOS_FILE + '.tmp';
  await fs.writeFile(tmpFile, JSON.stringify(todos, null, 2));
  await fs.rename(tmpFile, TODOS_FILE);
};

export const addTodo = async (text: string): Promise<ITodoItem> => {
  const todos = await readTodos();
  const item: ITodoItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(item);
  await writeTodos(todos);
  return item;
};

export const updateTodo = async (id: string, updates: Partial<Pick<ITodoItem, 'text' | 'completed'>>): Promise<ITodoItem | null> => {
  const todos = await readTodos();
  const item = todos.find((t) => t.id === id);
  if (!item) return null;
  if (updates.text !== undefined) item.text = updates.text;
  if (updates.completed !== undefined) item.completed = updates.completed;
  await writeTodos(todos);
  return item;
};

export const deleteTodo = async (id: string): Promise<boolean> => {
  const todos = await readTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  todos.splice(idx, 1);
  await writeTodos(todos);
  return true;
};
