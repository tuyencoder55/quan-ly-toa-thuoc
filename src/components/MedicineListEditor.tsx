import React from 'react';
import { MedicineItem } from '../types';
import { Plus, Trash2, Pill } from 'lucide-react';

interface MedicineListEditorProps {
  medicines: MedicineItem[];
  onChange: (medicines: MedicineItem[]) => void;
  readOnly?: boolean;
}

/**
 * Trình biên tập và hiển thị danh sách thuốc trong đơn
 * Hỗ trợ thêm thuốc mới, xóa thuốc, sửa tên, hàm lượng, cách dùng
 */
export const MedicineListEditor: React.FC<MedicineListEditorProps> = ({
  medicines,
  onChange,
  readOnly = false,
}) => {
  const handleItemChange = (index: number, field: keyof MedicineItem, value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([
      ...medicines,
      { name: '', dosage: '', usage: '' },
    ]);
  };

  if (readOnly) {
    if (medicines.length === 0) {
      return (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-sm text-slate-400">
          Chưa có thông tin thuốc trong toa
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {medicines.map((med, index) => (
          <div
            key={index}
            className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs flex items-start gap-3"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Pill className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-800 text-sm">
                  {index + 1}. {med.name || 'Thuốc chưa đặt tên'}
                </span>
                {med.dosage && (
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                    {med.dosage}
                  </span>
                )}
              </div>
              {med.usage && (
                <p className="text-xs text-slate-500 mt-1">
                  👉 {med.usage}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-blue-600" />
          Danh sách thuốc ({medicines.length})
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 active-press"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm thuốc
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
          <p className="text-xs text-slate-500">Chưa có thuốc nào được nhận diện</p>
          <button
            type="button"
            onClick={handleAdd}
            className="mt-2 text-xs font-medium text-blue-600 underline"
          >
            + Bấm vào đây để thêm thuốc thủ công
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {medicines.map((med, index) => (
            <div
              key={index}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                  title="Xóa thuốc này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Tên thuốc (ví dụ: Panadol)"
                  value={med.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Liều lượng (ví dụ: 500mg, 10 viên)"
                  value={med.dosage || ''}
                  onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <input
                type="text"
                placeholder="Cách dùng (ví dụ: Uống 1 viên sau ăn sáng)"
                value={med.usage || ''}
                onChange={(e) => handleItemChange(index, 'usage', e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-600"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
