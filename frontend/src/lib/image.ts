/** Comprime una imagen del dispositivo a JPEG data URL listo para subir. */
export async function compressImageFile(file: File, maxSize = 512, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Elige una imagen');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('La imagen es demasiado grande (máx. 12MB)');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (dataUrl.length > 1_200_000) {
    return canvas.toDataURL('image/jpeg', 0.55);
  }
  return dataUrl;
}
