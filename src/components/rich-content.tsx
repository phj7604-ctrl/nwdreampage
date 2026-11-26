import { sanitizeHtml } from "@/lib/content";

/** 게시글 본문 HTML(표·사진 포함)을 사이트 스타일로 보여 준다. 스타일은 globals.css 의 .rich-content */
export function RichContent({ html }: { html: string }) {
  return <div className="rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
