export const EMPTY_MACRO_FORM = { name: '', calories: '', carbs_g: '', protein_g: '', fats_g: '' }

export default function MacroForm({ form, onChange, onSave, onCancel, saving }) {
  return (
    <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Protein Shake"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'calories', label: 'Calories (kcal)' },
          { key: 'carbs_g', label: 'Carbs (g)' },
          { key: 'protein_g', label: 'Protein (g)' },
          { key: 'fats_g', label: 'Fat (g)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input
              type="number"
              value={form[key]}
              onChange={e => onChange({ ...form, [key]: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!form.name.trim() || saving}
          className="flex-1 h-9 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-9 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
