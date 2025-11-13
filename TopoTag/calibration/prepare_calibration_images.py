import os
from PIL import Image
import pillow_heif

# --- CONFIGURATION ---
input_folder = "calibration_images_heic"
output_folder = "calibration_images"

# Ensure output directory exists
os.makedirs(output_folder, exist_ok=True)

# Supported HEIC extensions
heic_exts = (".heic", ".HEIC")

# --- CONVERT ALL HEIC FILES TO JPG ---
count = 0
for filename in os.listdir(input_folder):
    if filename.endswith(heic_exts):
        heif_path = os.path.join(input_folder, filename)
        base_name = os.path.splitext(filename)[0]
        jpg_path = os.path.join(output_folder, f"{base_name}.jpg")

        try:
            heif_file = pillow_heif.read_heif(heif_path)
            image = Image.frombytes(
                heif_file.mode, heif_file.size, heif_file.data, "raw"
            )
            image = image.convert("RGB")  # ensure color
            image.save(jpg_path, "JPEG", quality=95)
            count += 1
            print(f"Converted: {filename} → {jpg_path}")
        except Exception as e:
            print(f"Failed to convert {filename}: {e}")

print(f"\nConversion complete — {count} images saved to '{output_folder}'")
