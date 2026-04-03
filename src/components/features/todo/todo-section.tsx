import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Check, Trash2, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ITodoItem } from '@/types/todo';

const TodoSection = () => {
  const [todos, setTodos] = useState<ITodoItem[]>([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/todos')
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const handleAdd = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;
    setNewText('');
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const item = (await res.json()) as ITodoItem;
      setTodos((prev) => [...prev, item]);
    }
    inputRef.current?.focus();
  }, [newText]);

  const handleToggle = useCallback(async (id: string, completed: boolean) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    await fetch('/api/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed }),
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch('/api/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  }, []);

  const handleEditStart = useCallback((item: ITodoItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      setEditingId(null);
      return;
    }
    setTodos((prev) => prev.map((t) => (t.id === editingId ? { ...t, text } : t)));
    setEditingId(null);
    await fetch('/api/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, text }),
    });
  }, [editingId, editText]);

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="할 일 추가..."
          className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {activeTodos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {activeTodos.map((item) => (
            <TodoItem
              key={item.id}
              item={item}
              editing={editingId === item.id}
              editText={editText}
              editRef={editRef}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditTextChange={setEditText}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
            />
          ))}
        </ul>
      )}

      {completedTodos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {completedTodos.map((item) => (
            <TodoItem
              key={item.id}
              item={item}
              editing={editingId === item.id}
              editText={editText}
              editRef={editRef}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditTextChange={setEditText}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

interface ITodoItemProps {
  item: ITodoItem;
  editing: boolean;
  editText: string;
  editRef: React.RefObject<HTMLInputElement | null>;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEditStart: (item: ITodoItem) => void;
  onEditTextChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}

const TodoItem = ({
  item,
  editing,
  editText,
  editRef,
  onToggle,
  onDelete,
  onEditStart,
  onEditTextChange,
  onEditSave,
  onEditCancel,
}: ITodoItemProps) => (
  <li className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50">
    <button
      onClick={() => onToggle(item.id, !item.completed)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        item.completed
          ? 'border-muted-foreground/40 bg-muted-foreground/20 text-muted-foreground'
          : 'border-foreground/30 hover:border-foreground/60',
      )}
    >
      {item.completed && <Check className="h-3 w-3" />}
    </button>

    {editing ? (
      <input
        ref={editRef}
        type="text"
        value={editText}
        onChange={(e) => onEditTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEditSave();
          if (e.key === 'Escape') onEditCancel();
        }}
        onBlur={onEditSave}
        className="h-6 flex-1 rounded border border-input bg-transparent px-1.5 text-sm outline-none focus-visible:border-ring"
      />
    ) : (
      <span
        className={cn(
          'flex-1 text-sm',
          item.completed && 'text-muted-foreground line-through',
        )}
        onDoubleClick={() => !item.completed && onEditStart(item)}
      >
        {item.text}
      </span>
    )}

    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      {!item.completed && !editing && (
        <button
          onClick={() => onEditStart(item)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
      {editing && (
        <button
          onClick={onEditCancel}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={() => onDelete(item.id)}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  </li>
);

export default TodoSection;
