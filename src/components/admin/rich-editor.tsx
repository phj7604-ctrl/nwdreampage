"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState } from "react";
import { uploadImage } from "@/lib/admin/client";

/** 글쓰기 편집기: 굵게·제목·목록·정렬·링크·글자색·표·사진 */
export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false }),
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: { attributes: { class: "rich-content min-h-72 px-4 py-3 focus:outline-none" } },
  });

  // 다른 글/언어로 바뀌면 내용 교체
  const lastValue = useRef(value);
  useEffect(() => {
    if (editor && value !== lastValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    lastValue.current = value;
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

const COLORS = ["#1f2421", "#d92d20", "#1f6feb", "#1f7a5c", "#b54708"];

function Toolbar({ editor }: { editor: Editor }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      link: e.isActive("link"),
      table: e.isActive("table"),
    }),
  });

  const chain = () => editor.chain().focus();

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadImage(f);
        chain().setImage({ src: url }).run();
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("연결할 주소(URL)를 입력하세요. 비우면 링크가 해제됩니다.", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) chain().unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface p-2">
      <Btn on={s.bold} onClick={() => chain().toggleBold().run()} title="굵게">
        <b>B</b>
      </Btn>
      <Btn on={s.italic} onClick={() => chain().toggleItalic().run()} title="기울임">
        <i>I</i>
      </Btn>
      <Btn on={s.underline} onClick={() => chain().toggleUnderline().run()} title="밑줄">
        <u>U</u>
      </Btn>
      <Btn on={s.strike} onClick={() => chain().toggleStrike().run()} title="취소선">
        <s>S</s>
      </Btn>
      <Sep />
      <Btn on={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} title="큰 제목">
        제목1
      </Btn>
      <Btn on={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} title="작은 제목">
        제목2
      </Btn>
      <Btn on={s.bullet} onClick={() => chain().toggleBulletList().run()} title="글머리 목록">
        • 목록
      </Btn>
      <Btn on={s.ordered} onClick={() => chain().toggleOrderedList().run()} title="번호 목록">
        1. 목록
      </Btn>
      <Sep />
      <Btn on={s.left} onClick={() => chain().setTextAlign("left").run()} title="왼쪽 정렬">
        ⇤
      </Btn>
      <Btn on={s.center} onClick={() => chain().setTextAlign("center").run()} title="가운데 정렬">
        ↔
      </Btn>
      <Btn on={s.right} onClick={() => chain().setTextAlign("right").run()} title="오른쪽 정렬">
        ⇥
      </Btn>
      <Sep />
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title="글자색"
          onClick={() => (c === COLORS[0] ? chain().unsetColor().run() : chain().setColor(c).run())}
          className="size-6 rounded-full border border-border"
          style={{ background: c }}
        />
      ))}
      <Sep />
      <Btn on={s.link} onClick={setLink} title="링크">
        🔗 링크
      </Btn>
      <Btn onClick={() => fileRef.current?.click()} title="사진 넣기" disabled={uploading}>
        {uploading ? "올리는 중…" : "🖼 사진"}
      </Btn>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPickImages(e.target.files)} />
      <Btn onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 넣기">
        ▦ 표
      </Btn>
      {s.table && (
        <>
          <Btn onClick={() => chain().addRowAfter().run()} title="아래에 행 추가">
            +행
          </Btn>
          <Btn onClick={() => chain().addColumnAfter().run()} title="오른쪽에 열 추가">
            +열
          </Btn>
          <Btn onClick={() => chain().deleteRow().run()} title="행 삭제">
            −행
          </Btn>
          <Btn onClick={() => chain().deleteColumn().run()} title="열 삭제">
            −열
          </Btn>
          <Btn onClick={() => chain().deleteTable().run()} title="표 삭제">
            표 삭제
          </Btn>
        </>
      )}
      <Sep />
      <Btn onClick={() => chain().undo().run()} title="되돌리기">
        ↶
      </Btn>
      <Btn onClick={() => chain().redo().run()} title="다시 실행">
        ↷
      </Btn>
    </div>
  );
}

function Btn({
  on,
  children,
  ...props
}: { on?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-8 min-w-8 rounded-md px-2 text-sm disabled:opacity-50 ${
        on ? "bg-brand text-white dark:text-background" : "hover:bg-brand-soft"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-border" />;
