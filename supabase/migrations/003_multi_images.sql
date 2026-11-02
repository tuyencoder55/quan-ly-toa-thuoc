-- Thêm cột image_paths để hỗ trợ lưu nhiều ảnh toa thuốc (tối đa 20 ảnh/toa)
alter table public.prescriptions 
add column if not exists image_paths text[] not null default '{}'::text[];

-- Đồng bộ các toa cũ: đưa image_path hiện có vào mảng image_paths
update public.prescriptions 
set image_paths = array[image_path] 
where image_path is not null and (image_paths is null or cardinality(image_paths) = 0);
