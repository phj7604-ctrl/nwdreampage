/**
 * 페이지 안에 보이는 지도 (구글 지도 퍼가기 — API 키 불필요).
 * 카카오맵·네이버 지도로 바꾸려면 각 서비스에서 '지도 퍼가기' 코드를 받아 이 파일만 바꾸면 된다.
 */
export function MapEmbed({ address, locale, title }: { address: string; locale: string; title: string }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=${locale}&z=16&output=embed`;
  return (
    <iframe
      title={title}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="h-72 w-full rounded-2xl border border-border sm:h-96"
    />
  );
}
