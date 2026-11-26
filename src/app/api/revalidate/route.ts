import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/content";
import { unauthorized, verifyAdmin } from "@/lib/server/admin-auth";

/** 관리자가 글을 저장·삭제한 직후 호출 → 사이트에 바로 반영 (1분 캐시를 즉시 만료) */
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return unauthorized();
  revalidateTag(CONTENT_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
