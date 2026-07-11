async function loadImageSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('No se pudo leer la imagen'));
        el.src = url;
      });
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, cleanup: () => URL.revokeObjectURL(url) };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

/** Comprime una imagen del dispositivo a JPEG data URL listo para subir. */
export async function compressImageFile(file: File, maxSize = 512, quality = 0.72): Promise<string> {
  const isImage = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
  if (!isImage) {
    throw new Error('Elige una imagen');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('La imagen es demasiado grande (máx. 12MB)');
  }

  const { source, width, height, cleanup } = await loadImageSource(file);
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(source, 0, 0, w, h);
  cleanup();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (dataUrl.length > 1_200_000) {
    return canvas.toDataURL('image/jpeg', 0.55);
  }
  return dataUrl;
}
