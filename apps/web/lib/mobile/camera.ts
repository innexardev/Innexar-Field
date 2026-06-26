"use client";

import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export async function capturePhotoDataUrl(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

export function isCameraAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isPluginAvailable?: (name: string) => boolean } }).Capacitor;
  if (cap?.isPluginAvailable?.("Camera")) return true;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}
