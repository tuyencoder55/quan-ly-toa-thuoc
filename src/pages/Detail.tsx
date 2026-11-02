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
  Phone,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  Camera,
  Check,
  X,
  Maximize2,
  AlertCircle,
  History,
  ChevronRight,
  Pill,
  Image as ImageIcon
} from 'lucide-react';

interface DetailProps {
  prescriptionId: string;
  onBack: () => void;
  onDeleted: () => void;
  onSelectOtherPrescription?: (id: string) => void;
}

const MAX_PHOTOS = 20;

export const Detail: React.FC<DetailProps> = ({
  prescriptionId,
  onBack,
  onDeleted,
  onSelectOtherPrescription,
}) => {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [signedImageUrls, setSignedImageUrls] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lịch sử các toa khác của cùng khách hàng này
  const [historyItems, setHistoryItems] = useState<Prescription[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form chỉnh sửa
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMedicines, setEditMedicines] = useState<MedicineItem[]>([]);
  const [editNote, setEditNote] = useState('');

  // Modal phóng to ảnh
  const [showImageModal, setShowImageModal] = useState(false);

  // Input thêm ảnh mới
  const addCameraInputRef = useRef<HTMLInputElement>(null);
  const addGalleryInputRef = useRef<HTMLInputElement>(null);

  // 1. Tải thông tin toa thuốc và tạo Signed URL cho toàn bộ danh sách ảnh
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
      setEditPhone(data.phone || '');
      setEditAddress(data.address || '');
      setEditMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      setEditNote(data.note || '');

      // Lấy danh sách đường dẫn ảnh (hỗ trợ cả image_paths mảng và image_path đơn cũ)
      let paths: string[] = [];
      if (Array.isArray(data.image_paths) && data.image_paths.length > 0) {
        paths = data.image_paths;
      } else if (data.image_path) {
        paths = [data.image_path];
      }

      // Tạo Signed URL 60s cho tất cả các ảnh
      if (paths.length > 0) {
        const signedList: string[] = [];
        for (const p of paths) {
          const { data: signData } = await supabase.storage
            .from('prescriptions')
            .createSignedUrl(p, 60);
          if (signData?.signedUrl) {
            signedList.push(signData.signedUrl);
          }
        }
        setSignedImageUrls(signedList);
        setActivePhotoIndex(0);
      } else {
        setSignedImageUrls([]);
      }

      // Tải lịch sử các toa khác của cùng khách hàng này (theo tên hoặc số điện thoại)
      loadHistory(data.name_search, data.phone, data.id);
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết toa:', err);
      setErrorMessage(err.message || 'Không thể tải thông tin toa thuốc');
    } finally {
      setLoading(false);
    }
  };

  // Tải lịch sử các toa khác của khách này
  const loadHistory = async (nameSearch: string, phone: string | null, currentId: string) => {
    if (!nameSearch && !phone) return;
    setLoadingHistory(true);
    try {
      let historyQuery = supabase
        .from('prescriptions')
        .select('*')
        .neq('id', currentId)
        .order('created_at', { ascending: false });

      if (phone && nameSearch) {
        historyQuery = historyQuery.or(`name_search.eq.${nameSearch},phone.eq.${phone}`);
      } else if (nameSearch) {
        historyQuery = historyQuery.eq('name_search', nameSearch);
      } else if (phone) {
        historyQuery = historyQuery.eq('phone', phone);
      }

      const { data, error } = await historyQuery;

      if (!error && data) {
        setHistoryItems(data);
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử:', err);
    } finally {
      setLoadingHistory(false);
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
          phone: editPhone.trim() || null,
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

  // 3. Thêm ảnh mới vào toa hiện tại (tối đa 20 ảnh)
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !prescription) return;

    const currentPaths = Array.isArray(prescription.image_paths) ? prescription.image_paths : [];
    if (currentPaths.length + files.length > MAX_PHOTOS) {
      alert(`Toa thuốc này đã có ${currentPaths.length} ảnh. Bạn chỉ có thể lưu tối đa ${MAX_PHOTOS} ảnh.`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const newPaths: string[] = [];

      for (const file of files) {
        const compressedBlob = await compressImage(file, 1280, 0.7);
        const newPath = `${prescription.user_id}/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(newPath, compressedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;
        newPaths.push(newPath);
      }

      const updatedPaths = [...currentPaths, ...newPaths];

      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({
          image_paths: updatedPaths,
          image_path: updatedPaths[0] || null,
        })
        .eq('id', prescriptionId);

      if (updateError) throw updateError;

      await fetchPrescription();
      setActivePhotoIndex(updatedPaths.length - 1);
    } catch (err: any) {
      console.error('Lỗi khi thêm ảnh:', err);
      setErrorMessage(err.message || 'Không thể tải thêm ảnh lên.');
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  // 4. Xóa 1 ảnh trong toa
  const handleRemoveSinglePhoto = async (indexToRemove: number) => {
    if (!prescription) return;
    const currentPaths = Array.isArray(prescription.image_paths) ? prescription.image_paths : [];
    if (currentPaths.length <= 1) {
      alert('Toa thuốc cần có ít nhất 1 ảnh. Nếu muốn xóa cả toa, hãy bấm nút Xóa toa ở trên góc.');
      return;
    }

    const confirmRemove = window.confirm(`Bạn có chắc muốn xóa ảnh #${indexToRemove + 1} này không?`);
    if (!confirmRemove) return;

    setIsSaving(true);
    try {
      const pathToDelete = currentPaths[indexToRemove];
      // Xóa trong Storage
      if (pathToDelete) {
        await supabase.storage.from('prescriptions').remove([pathToDelete]);
      }

      const updatedPaths = currentPaths.filter((_, i) => i !== indexToRemove);
      await supabase
        .from('prescriptions')
        .update({
          image_paths: updatedPaths,
          image_path: updatedPaths[0] || null,
        })
        .eq('id', prescriptionId);

      await fetchPrescription();
      setActivePhotoIndex(Math.max(0, indexToRemove - 1));
    } catch (err: any) {
      console.error('Lỗi khi xóa ảnh:', err);
      setErrorMessage('Không thể xóa ảnh này.');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Xóa toàn bộ toa thuốc (xóa tất cả ảnh trong Storage rồi xóa dòng)
  const handleDelete = async () => {
    if (!prescription) return;
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa toàn bộ toa thuốc của khách hàng "${prescription.customer_name}" không?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const pathsToDelete = Array.isArray(prescription.image_paths) && prescription.image_paths.length > 0
        ? prescription.image_paths
        : prescription.image_path
        ? [prescription.image_path]
        : [];

      if (pathsToDelete.length > 0) {
        await supabase.storage.from('prescriptions').remove(pathsToDelete);
      }

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

  const currentSignedUrl = signedImageUrls[activePhotoIndex] || signedImageUrls[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Input ẩn để chụp thêm ảnh bằng camera */}
      <input
        ref={addCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleAddPhotos}
      />

      {/* Input ẩn để chọn thêm nhiều ảnh từ bộ sưu tập */}
      <input
        ref={addGalleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddPhotos}
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

        {/* Khung ảnh toa thuốc chính */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200 aspect-video flex items-center justify-center">
          {currentSignedUrl ? (
            <img
              src={currentSignedUrl}
              alt={`Ảnh toa thuốc #${activePhotoIndex + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-slate-400 flex flex-col items-center gap-1">
              <Camera className="w-6 h-6 text-slate-500" />
              <span>Chưa có ảnh toa thuốc</span>
            </div>
          )}

          {/* Đếm số trang ảnh */}
          {signedImageUrls.length > 0 && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 text-white rounded-full text-xs font-medium backdrop-blur-md">
              Ảnh {activePhotoIndex + 1} / {signedImageUrls.length}
            </div>
          )}

          {currentSignedUrl && (
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-medium active-press"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Xem toàn màn hình
            </button>
          )}
        </div>

        {/* Danh sách các ảnh thumbnail kèm nút THÊM ẢNH BỔ SUNG */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Hình ảnh toa thuốc ({signedImageUrls.length}/{MAX_PHOTOS} ảnh)
            </span>
            <span className="text-[11px] text-slate-400">
              Chụp thêm mặt sau hoặc toa bổ sung
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 smooth-scroll">
            {signedImageUrls.map((url, index) => (
              <div
                key={index}
                onClick={() => setActivePhotoIndex(index)}
                className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                  index === activePhotoIndex
                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Ảnh ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center font-bold">
                  #{index + 1}
                </span>

                {signedImageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSinglePhoto(index);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                    title="Xóa ảnh này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Nút thêm ảnh vào toa này */}
            {signedImageUrls.length < MAX_PHOTOS && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => addCameraInputRef.current?.click()}
                  disabled={isSaving}
                  className="w-16 h-16 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-100/60 text-blue-600 flex flex-col items-center justify-center gap-1 active-press disabled:opacity-50"
                  title="Chụp thêm ảnh bằng camera"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold">+ Chụp</span>
                </button>

                <button
                  type="button"
                  onClick={() => addGalleryInputRef.current?.click()}
                  disabled={isSaving}
                  className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500 flex flex-col items-center justify-center gap-1 active-press disabled:opacity-50"
                  title="Chọn thêm ảnh từ máy"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">+ Chọn</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Khối thông tin chi tiết */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          {isEditing ? (
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
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
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

              {prescription.phone && (
                <div className="p-2.5 bg-blue-50/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Số điện thoại</span>
                      <a
                        href={`tel:${prescription.phone}`}
                        className="font-bold text-blue-700 hover:underline"
                      >
                        {prescription.phone}
                      </a>
                    </div>
                  </div>
                  <a
                    href={`tel:${prescription.phone}`}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-semibold active-press"
                  >
                    Gọi ngay
                  </a>
                </div>
              )}

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

        {/* KHỐI LỊCH SỬ CÁC TOA KHÁC CỦA KHÁCH HÀNG NÀY (Cách 3) */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              Lịch sử các lần khám khác ({historyItems.length})
            </h3>
          </div>

          {loadingHistory ? (
            <p className="text-xs text-slate-400 py-2 text-center animate-pulse">
              Đang tải lịch sử...
            </p>
          ) : historyItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
              Khách hàng này chưa có toa thuốc nào khác trong hệ thống.
            </p>
          ) : (
            <div className="space-y-2">
              {historyItems.map((item) => {
                const medCount = Array.isArray(item.medicines) ? item.medicines.length : 0;
                const imgCount = Array.isArray(item.image_paths) && item.image_paths.length > 0
                  ? item.image_paths.length
                  : item.image_path ? 1 : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectOtherPrescription ? onSelectOtherPrescription(item.id) : null}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 cursor-pointer active-press flex items-center justify-between transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {new Date(item.created_at).toLocaleDateString('vi-VN')}
                        </span>
                        {medCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                            <Pill className="w-3 h-3" />
                            {medCount} thuốc
                          </span>
                        )}
                        {imgCount > 1 && (
                          <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            {imgCount} ảnh
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                          Ghi chú: {item.note}
                        </p>
                      )}
                    </div>

                    <div className="text-slate-400 pl-2">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ImageViewerModal
        imageUrl={showImageModal ? currentSignedUrl : null}
        onClose={() => setShowImageModal(false)}
      />
    </div>
  );
};
