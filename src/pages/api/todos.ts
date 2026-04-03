import type { NextApiRequest, NextApiResponse } from 'next';
import { readTodos, addTodo, updateTodo, deleteTodo } from '@/lib/todo-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET': {
      const todos = await readTodos();
      return res.status(200).json(todos);
    }
    case 'POST': {
      const { text } = req.body as { text?: string };
      if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
      const item = await addTodo(text.trim());
      return res.status(201).json(item);
    }
    case 'PATCH': {
      const { id, text, completed } = req.body as { id?: string; text?: string; completed?: boolean };
      if (!id) return res.status(400).json({ error: 'id is required' });
      const item = await updateTodo(id, { text, completed });
      if (!item) return res.status(404).json({ error: 'not found' });
      return res.status(200).json(item);
    }
    case 'DELETE': {
      const { id } = req.body as { id?: string };
      if (!id) return res.status(400).json({ error: 'id is required' });
      const ok = await deleteTodo(id);
      if (!ok) return res.status(404).json({ error: 'not found' });
      return res.status(200).json({ ok: true });
    }
    default:
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
      return res.status(405).json({ error: 'method-not-allowed' });
  }
};

export default handler;
