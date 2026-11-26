// 사진 저장소 — 업로드 저장 위치는 이 파일 한 곳에서만 정한다.
//
// 현재: Vercel Blob (무료 1GB, 결제수단 불필요. 한도를 넘으면 청구 대신 업로드가 멈춤)
// 나중에 이미지·영상이 많아지면 Firebase Storage(Blaze 요금제)로 바꾸기로 함
//   → saveImage() 안쪽만 Firebase Storage 업로드로 교체하면 나머지 코드는 그대로 동작한다.
import "server-only";
import { put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 브라우저에서 압축해 보내므로 보통 1MB 미만
export const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif"];

export function isStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveImage(file: Blob, contentType: string): Promise<string> {
  const now = new Date();
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const path = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const blob = await put(path, file, { access: "public", contentType, addRandomSuffix: false });
  return blob.url;
}
