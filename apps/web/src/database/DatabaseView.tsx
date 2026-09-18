import React, { useState } from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { DatabaseColumnType, DatabaseColumnOption } from '@nodex/shared';
import { Plus, Trash2, Type, Hash, CheckSquare, Calendar, ChevronDown, X } from 'lucide-react';
import { EmojiPicker } from '../components/EmojiPicker';
import { TagEditor } from '../components/TagEditor';
import { uuid } from '../lib/uuid';

interface DatabaseViewProps {
  databaseId: string;
}

const TYPE_ICONS: Record<DatabaseColumnType, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  number: <Hash className="w-3 h-3" />,
  select: <ChevronDown className="w-3 h-3" />,
  checkbox: <CheckSquare className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
};

const TYPE_LABELS: Record<DatabaseColumnType, string> = {
  text: 'Texto',
  number: 'Número',
  select: 'Seleção',
  checkbox: 'Caixa de Seleção',
  date: 'Data',
};

const OPTION_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const AddColumnForm: React.FC<{ onAdd: (name: string, type: DatabaseColumnType) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DatabaseColumnType>('text');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), type);
  };

  return (
    <div className="absolute z-30 top-full mt-1 left-0 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2.5 space-y-2">
      <input
        type="text"
        autoFocus
        placeholder="Nome da coluna..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as DatabaseColumnType)}
        className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
      >
        {(Object.keys(TYPE_LABELS) as DatabaseColumnType[]).map((t) => (
          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
        ))}
      </select>
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={onCancel} className="px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200">Cancelar</button>
        <button onClick={handleSubmit} className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow">Adicionar</button>
      </div>
    </div>
  );
};

const SelectOptionsEditor: React.FC<{
  options: DatabaseColumnOption[];
  onChange: (options: DatabaseColumnOption[]) => void;
  onClose: () => void;
}> = ({ options, onChange, onClose }) => {
  const [newLabel, setNewLabel] = useState('');

  const addOption = () => {
    if (!newLabel.trim()) return;
    onChange([...options, { id: `opt-${uuid()}`, label: newLabel.trim(), color: OPTION_COLORS[options.length % OPTION_COLORS.length] }]);
    setNewLabel('');
  };

  return (
    <div className="absolute z-30 top-full mt-1 right-0 w-52 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2.5 space-y-2">
      <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-0.5">Opções</div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center justify-between gap-1.5 px-1.5 py-1 rounded-md bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-200 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </span>
            <button onClick={() => onChange(options.filter((o) => o.id !== opt.id))} className="text-neutral-500 hover:text-rose-400 shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="Nova opção..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
          className="flex-1 bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800 text-[11px] text-neutral-100 placeholder-neutral-500 focus:outline-none min-w-0"
        />
        <button onClick={addOption} className="p-1 bg-indigo-600 hover:bg-indigo-500 rounded-md shrink-0"><Plus className="w-3 h-3 text-white" /></button>
      </div>
      <button onClick={onClose} className="w-full text-[11px] text-neutral-400 hover:text-neutral-200 pt-1">Fechar</button>
    </div>
  );
};

export const DatabaseView: React.FC<DatabaseViewProps> = ({ databaseId }) => {
  const {
    nodes,
    updateNode,
    addDatabaseColumn,
    updateDatabaseColumn,
    deleteDatabaseColumn,
    addDatabaseRow,
    updateRowValue,
    deleteDatabaseRow,
  } = useNodeStore();

  const database = nodes.find((n) => n.id === databaseId);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingOptionsFor, setEditingOptionsFor] = useState<string | null>(null);

  if (!database || !database.databaseConfig) return null;

  const { columns, rowNodeIds } = database.databaseConfig;
  const rows = rowNodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const renderCell = (rowId: string, colId: string, type: DatabaseColumnType, value: any, options?: DatabaseColumnOption[]) => {
    switch (type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateRowValue(databaseId, rowId, colId, e.target.checked)}
            className="w-3.5 h-3.5 accent-indigo-500"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => updateRowValue(databaseId, rowId, colId, e.target.value === '' ? null : Number(e.target.value))}
            placeholder="—"
            className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => updateRowValue(databaseId, rowId, colId, e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-200 focus:outline-none [color-scheme:dark]"
          />
        );
      case 'select': {
        const selected = (options || []).find((o) => o.id === value);
        return (
          <select
            value={value || ''}
            onChange={(e) => updateRowValue(databaseId, rowId, colId, e.target.value || null)}
            className="w-full bg-transparent text-xs focus:outline-none cursor-pointer"
            style={{ color: selected?.color || '#a3a3a3' }}
          >
            <option value="">—</option>
            {(options || []).map((o) => (
              <option key={o.id} value={o.id} style={{ color: '#fff', backgroundColor: '#171717' }}>{o.label}</option>
            ))}
          </select>
        );
      }
      case 'text':
      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => updateRowValue(databaseId, rowId, colId, e.target.value)}
            placeholder="—"
            className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none"
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-5 flex items-center gap-3">
        <EmojiPicker
          value={database.icon || '🗄️'}
          onChange={(emoji) => updateNode(databaseId, { icon: emoji })}
          triggerClassName="w-10 h-10 text-2xl text-center bg-transparent hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors focus:outline-none"
        />
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={database.title}
            onChange={(e) => updateNode(databaseId, { title: e.target.value })}
            className="text-2xl font-bold bg-transparent text-neutral-100 placeholder-neutral-600 focus:outline-none tracking-tight w-full"
          />
          <div className="mt-1.5">
            <TagEditor nodeId={databaseId} tags={database.tags} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-neutral-800">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-neutral-900/80 sticky top-0 z-10">
              <th className="px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-r border-neutral-800 min-w-[200px]">
                Nome
              </th>
              {columns.map((col) => (
                <th key={col.id} className="px-3 py-2.5 border-b border-r border-neutral-800 min-w-[140px] relative group/col">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider truncate">
                      {TYPE_ICONS[col.type]}
                      {col.name}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity shrink-0">
                      {col.type === 'select' && (
                        <button
                          onClick={() => setEditingOptionsFor(editingOptionsFor === col.id ? null : col.id)}
                          className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-200"
                          title="Editar opções"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteDatabaseColumn(databaseId, col.id)}
                        className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-rose-400"
                        title="Excluir coluna"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {editingOptionsFor === col.id && (
                    <SelectOptionsEditor
                      options={col.options || []}
                      onChange={(options) => updateDatabaseColumn(databaseId, col.id, { options })}
                      onClose={() => setEditingOptionsFor(null)}
                    />
                  )}
                </th>
              ))}
              <th className="px-2 py-2.5 border-b border-neutral-800 w-10 relative">
                <button
                  onClick={() => setIsAddingColumn(!isAddingColumn)}
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-100"
                  title="Adicionar coluna"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {isAddingColumn && (
                  <AddColumnForm
                    onAdd={(name, type) => {
                      addDatabaseColumn(databaseId, name, type);
                      setIsAddingColumn(false);
                    }}
                    onCancel={() => setIsAddingColumn(false)}
                  />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group/row hover:bg-neutral-900/40">
                <td className="px-3 py-1.5 border-b border-r border-neutral-800/60">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">{row.icon || '📌'}</span>
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateNode(row.id, { title: e.target.value })}
                      className="flex-1 bg-transparent text-xs text-neutral-100 focus:outline-none min-w-0"
                    />
                    <button
                      onClick={() => deleteDatabaseRow(databaseId, row.id)}
                      className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 shrink-0 transition-opacity"
                      title="Excluir registro"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.id} className="px-3 py-1.5 border-b border-r border-neutral-800/60">
                    {renderCell(row.id, col.id, col.type, row.properties?.[col.id], col.options)}
                  </td>
                ))}
                <td className="border-b border-neutral-800/60" />
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={() => addDatabaseRow(databaseId)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo registro</span>
        </button>
      </div>
    </div>
  );
};
