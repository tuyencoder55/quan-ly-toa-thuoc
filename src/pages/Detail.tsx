import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/compressImage';
import { normalizeName } from '../lib/normalizeName';
import { Prescription, MedicineItem } from '../types';
import { MedicineListEditor } from '../components/MedicineListEditor';
import { ImageViewerModal } from '../components/ImageViewerModal';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  Camera,
  Check,
  X,
  Maximize2,
  AlertCircle
} from 'lucide-react';

interface DetailProps {
  prescriptionId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export const Detail: React.FC<DetailProps> = ({ prescriptionId, onBack, onDeleted }) => {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form chỉnh sửa
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMedicines, setEditMedicines] = useState<MedicineItem[]>([]);
  const [editNote, setEditNote] = useState('');

  // Modal phóng to ảnh
  const [showImageModal, setShowImageModal] = useState(false);

  // Input thay đổi ảnh
  const replacePhotoInputRef = useRef<HTMLInputElement>(null);

  // 1. Tải thông tin toa thuốc và tạo Signed URL tạm thời (60s) cho ảnh
  const fetchPrescription = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .single();

      if (error) throw error;
      setPrescription(data);

      setEditCustomerName(data.customer_name);
      setEditBirthDate(data.birth_date || '');
      setEditAddress(data.address || '');
      setEditMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      setEditNote(data.note || '');

      // Tạo Signed URL 60s từ bucket private
      if (data.image_path) {
        const { data: signData, error: signError } = await supabase.storage
          .from('prescriptions')
          .createSignedUrl(data.image_path, 60);

        if (!signError && signData) {
          setSignedImageUrl(signData.signedUrl);
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết toa:', err);
      setErrorMessage(err.message || 'Không thể tải thông tin toa thuốc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescription();
  }, [prescriptionId]);

  // 2. Lưu thông tin chỉnh sửa
  const handleSaveChanges = async () => {
    if (!editCustomerName.trim()) {
      setErrorMessage('Tên khách hàng không được để trống.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({
          customer_name: editCustomerName.trim(),
          name_search: normalizeName(editCustomerName),
          birth_date: editBirthDate || null,
          address: editAddress.trim() || null,
          medicines: editMedicines.filter((m) => m.name.trim().length > 0),
          note: editNote.trim() || null,
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      setIsEditing(false);
      await fetchPrescription();
    } catch (err: any) {
      console.error('Lỗi khi cập nhật toa:', err);
      setErrorMessage(err.message || 'Không thể cập nhật thông tin.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Thay ảnh toa thuốc mới (nén ảnh, upload, xóa ảnh cũ trong Storage)
  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !prescription) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Nén ảnh mới
      const newBlob = await compressImage(file, 1280, 0.7);
      const newPath = `${prescription.user_id}/${crypto.randomUUID()}.jpg`;

      // Upload ảnh mới
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(newPath, newBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Xóa ảnh cũ trong Storage nếu có
      if (prescription.image_path) {
        await supabase.storage.from('prescriptions').remove([prescription.image_path]);
      }

      // Cập nhật đường dẫn trong database
      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({ image_path: newPath })
        .eq('id', prescriptionId);

      if (updateError) throw updateError;

      await fetchPrescription();
    } catch (err: any) {
      console.error('Lỗi khi thay ảnh:', err);
      setErrorMessage(err.message || 'Không thể thay đổi ảnh.');
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  // 4. Xóa toa thuốc (xóa ảnh trong Storage trước, rồi xóa row)
  const handleDelete = async () => {
    if (!prescription) return;
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa toa thuốc của khách hàng "${prescription.customer_name}" không?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      // Xóa ảnh trong Storage
      if (prescription.image_path) {
        await supabase.storage.from('prescriptions').remove([prescription.image_path]);
      }

      // Xóa bản ghi trong database
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionId);

      if (error) throw error;

      onDeleted();
    } catch (err: any) {
      console.error('Lỗi khi xóa toa:', err);
      setErrorMessage(err.message || 'Không thể xóa toa thuốc.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm animate-pulse">
          Đang tải thông tin toa thuốc...
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-center">
        <p className="text-slate-500 mb-4">Không tìm thấy thông tin toa thuốc này.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Input thay ảnh ẩn */}
      <input
        ref={replacePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReplacePhoto}
      />

      {/* Header điều hướng */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-full active-press flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Danh sách</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-full active-press"
                title="Hủy sửa"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1 py-1.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs active-press disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu lại'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-600 hover:text-blue-600 rounded-full active-press"
                title="Sửa thông tin"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-600 rounded-full active-press"
                title="Xóa toa này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Khung ảnh toa thuốc */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200 aspect-video flex items-center justify-center">
          {signedImageUrl ? (
            <img
              src={signedImageUrl}
              alt="Toa thuốc"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-slate-400 flex flex-col items-center gap-1">
              <Camera className="w-6 h-6 text-slate-500" />
              <span>Chưa có ảnh toa thuốc</span>
            </div>
          )}

          {signedImageUrl && (
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-medium active-press"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Xem toàn màn hình
            </button>
          )}

          {/* Nút thay ảnh nhanh */}
          <button
            type="button"
            onClick={() => replacePhotoInputRef.current?.click()}
            className="absolute top-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md flex items-center gap-1 text-xs font-medium active-press"
            title="Chụp hoặc chọn ảnh mới"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Thay ảnh</span>
          </button>
        </div>

        {/* Khối thông tin chi tiết */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          {isEditing ? (
            // Form chỉnh sửa
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên khách hàng
                </label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full text-base font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              <MedicineListEditor
                medicines={editMedicines}
                onChange={setEditMedicines}
              />

              <hr className="border-slate-100" />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
            </div>
          ) : (
            // Hiển thị đọc
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Khách hàng
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {prescription.customer_name}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngày sinh</span>
                    <span className="font-semibold text-slate-700">
                      {prescription.birth_date
                        ? new Date(prescription.birth_date).toLocaleDateString('vi-VN')
                        : 'Chưa có'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngày lưu</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(prescription.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              {prescription.address && (
                <div className="p-2.5 bg-slate-50 rounded-xl flex items-start gap-2 text-xs">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Địa chỉ</span>
                    <span className="font-medium text-slate-700">{prescription.address}</span>
                  </div>
                </div>
              )}

              <hr className="border-slate-100" />

              {/* Danh sách thuốc */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Đơn thuốc ({Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} loại)
                </h3>
                <MedicineListEditor
                  medicines={Array.isArray(prescription.medicines) ? prescription.medicines : []}
                  onChange={() => {}}
                  readOnly
                />
              </div>

              {prescription.note && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs">
                  <span className="font-semibold text-amber-800 block mb-0.5">Ghi chú:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{prescription.note}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ImageViewerModal
        imageUrl={showImageModal ? signedImageUrl : null}
        onClose={() => setShowImageModal(false)}
      />
    </div>
  );
};
