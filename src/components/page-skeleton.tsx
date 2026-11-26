/** 게시글·페이지를 불러오는 동안 보여 주는 자리 표시 (Suspense fallback) */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:py-12" aria-busy="true">
      <div className="mb-6 h-4 w-40 rounded bg-border" />
      <div className="mb-8 h-8 w-2/3 rounded bg-border" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-11/12 rounded bg-border" />
        <div className="h-4 w-4/5 rounded bg-border" />
      </div>
    </div>
  );
}
