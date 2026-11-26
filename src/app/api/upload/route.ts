import { unauthorized, verifyAdmin } from "@/lib/server/admin-auth";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, isStorageConfigured, saveImage } from "@/lib/server/media-storage";

/** 관리자 사진 업로드: multipart/form-data 의 file 필드 → 저장 후 { url } */
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return unauthorized();

  if (!isStorageConfigured()) {
    return Response.json(
      { error: "사진 저장소(Vercel Blob)가 아직 연결되지 않았습니다. 배포 설정 후 사용할 수 있어요." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return Response.json({ error: "파일이 없습니다." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return Response.json({ error: "사진 파일만 올릴 수 있습니다." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "사진이 너무 큽니다 (최대 8MB)." }, { status: 413 });

  try {
    const url = await saveImage(file, file.type);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: `업로드 실패: ${(e as Error).message}` }, { status: 500 });
  }
}
