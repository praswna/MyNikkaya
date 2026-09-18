"use client";

import { Fragment, memo, useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { highlightSourceLines, scanSpeechRanges, type SourceToken, type SourceTokenKind, type SpeechKind } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

interface SourceEditorProps {
  initialValue: string;
  // 고칠 때마다 부른다. 부모는 이 값을 ref 에만 담아 두고 다시 그리지 않는다.
  onChange: (next: string) => void;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  marginY: number; // 오른쪽 위 버튼에 첫 줄이 가리지 않도록 두는 위아래 여백
  onExitEdit: () => void; // e 단축키로 수정을 마치고 나갈 때 부른다 (저장 버튼과 같은 동작)
  onMoveCategory: () => void; // c 단축키 - 카테고리 옮기기 창을 연다 (서랍 버튼과 같은 동작)
  onDelete: () => void;       // x 단축키 - 글 삭제 (휴지통 버튼과 같은 동작)
}

// 조각별 색 - 읽기 화면(RubyText)과 같은 색을 쓴다
function tokenColor(kind: SourceTokenKind, colors: ThemeColors): string {
  switch (kind) {
    case "base": return colors.textEmphasis;
    case "ruby": return colors.rubyText;
    case "note": return colors.rubyText;
    case "bold": return colors.textBold;
    case "emphasis": return colors.textAccent;
    case "link": return colors.textEmphasis;
    case "talk": return colors.talkText;
    case "say": return colors.sayText;
    default: return colors.text;
  }
}

// 눌러서 선택한 글을 감싸는 마크업 버튼들.
// 여는·닫는 표시를 손으로 치지 않아도 되고, 정확한 글자 수만큼 커서를 넣고 뺀다.
// color 는 읽기 화면에서 실제로 그 마크업이 쓰는 색과 같다 - 버튼만 보고도
// 어떤 계열인지, 어느 둘이 짝(제목·부분강조 / 대화·말씀)인지 알 수 있게 한다.
// 이 마크업들은 모두 줄 단위 표시다. 줄 일부만 골라도 그 줄 전체가 감싸이게 한다
// (wrapSelection 이 줄바꿈 사이까지 선택을 넓힌 뒤 감싼다).
const MARKUP_BUTTONS: { label: string; open: string; close: string; title: string; color: (c: ThemeColors) => string }[] = [
  { label: "[[ ]]", open: "[[", close: "]]", title: "제목 (굵게 + 강조색) - 1", color: (c) => c.textBold },
  { label: "[ ]", open: "[", close: "]", title: "부분강조 - 2", color: (c) => c.textAccent },
  { label: "> <", open: "> ", close: " <", title: "인용/대화 판 - 3", color: (c) => c.talkText },
  { label: ">> <<", open: ">> ", close: " <<", title: "말씀/강조 판 - 4", color: (c) => c.sayText },
];

// 루비를 달 때 걷어내는 따옴표들 - 작은·큰따옴표와 굽은 따옴표, 낫표까지 본다.
// '읽기(Reading)' 처럼 감싸 둔 글을 골라도 따옴표 없이 읽기{Reading} 이 되게 한다.
const QUOTE_CHARS = "\"'\u2018\u2019\u201c\u201d\u00ab\u00bb\u300c\u300d\u300e\u300f";
const QUOTE = `[${QUOTE_CHARS}]`;

// 고른 글 앞뒤에 붙은 따옴표를 뗀다 (가운데 것은 본문이므로 그대로 둔다)
function stripQuotes(text: string): string {
  return text
    .replace(new RegExp(`^${QUOTE}+\\s*`), "")
    .replace(new RegExp(`\\s*${QUOTE}+$`), "");
}

// 한 줄. 내용이 그대로면 다시 그리지 않는다 (타자 한 번에 건드리는 줄은 보통 하나뿐이다)
const SourceLine = memo(function SourceLine({ tokens, colors }: { tokens: SourceToken[]; colors: ThemeColors }) {
  // 빈 줄도 한 줄만큼 자리를 차지해야 글자가 어긋나지 않는다
  if (tokens.length === 0) return <div style={{ whiteSpace: "pre-wrap" }}>{"​"}</div>;
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      {tokens.map((token, i) => (
        <span
          key={i}
          style={{
            color: tokenColor(token.kind, colors),
            // 주석은 읽을 때 본문에 흐르지 않으므로 옅게 둔다
            opacity: token.kind === "note" ? 0.6 : undefined,
          }}
        >
          {token.text}
        </span>
      ))}
    </div>
  );
}, (prev, next) => {
  if (prev.colors !== next.colors || prev.tokens.length !== next.tokens.length) return false;
  return prev.tokens.every((token, i) => token.text === next.tokens[i].text && token.kind === next.tokens[i].kind);
});

// 줄마다 어느 판(대화/말씀)에 속하는지 정한다. 읽기 화면(RubyText)처럼 판 배경을 깔아서
// 고치는 동안에도 "여기부터 여기까지가 한 판"임을 보여준다.
// 조각(토큰)의 kind 가 아니라 원문 문자 위치로 판단한다 - 판 안에 루비 낱말이 있으면
// 그 조각은 "루비" 계열 색으로 바뀌어 kind 만으로는 그 줄이 판 안인지 알 수 없다.
// 위치로 판단하면 빈 줄(문단 구분)도 저절로 판에 포함된다 - 따로 잇는 로직이 필요 없다.
function resolveLineSpeechKinds(value: string): SpeechKind[] {
  const ranges = scanSpeechRanges(value);
  let pos = 0;
  return value.split("\n").map((line) => {
    const start = pos;
    const end = pos + line.length;
    pos = end + 1; // "\n" 만큼 다음 줄로 넘어간다
    const hit = ranges.find((r) => r.start < end && r.end > start);
    return hit ? hit.kind : "plain";
  });
}

// 판 배경을 배경색으로만 칠한다 (안쪽 여백·둘레 여백을 두면 그 줄들이 아래로 밀려나
// 뒤에 겹친 투명 textarea 와 어긋난다 - 커서·타자 위치가 틀어지면 안 되므로 여백은 못 쓴다).
function speechBlockStyle(kind: SpeechKind, colors: ThemeColors): CSSProperties | undefined {
  if (kind === "plain") return undefined;
  return { backgroundColor: kind === "talk" ? colors.talkBg : colors.sayBg, borderRadius: "10px" };
}

// 본문 자리에서 원문을 고치는 입력칸.
//
// textarea 는 글자마다 색을 달리 칠할 수 없다.
// 그래서 색칠한 글을 뒤에 깔고, 그 위에 글자가 투명한 textarea 를 겹친다.
// 둘은 글꼴·크기·줄간격·정렬·줄바꿈 규칙이 모두 같아야 글자가 어긋나지 않는다.
//
// 높이는 뒤에 깔린 글이 정한다. textarea 는 그 위에 겹쳐 늘어나므로,
// 글자를 칠 때마다 높이를 재서 맞추지 않아도 된다.
export function SourceEditor({ initialValue, onChange, fontSize, lineHeight, colors, textareaRef, marginY, onExitEdit, onMoveCategory, onDelete }: SourceEditorProps) {
  // 글자는 여기서만 들고 있는다. 위로 올리면 글자 하나에 화면 전체가 다시 그려진다.
  const [value, setValue] = useState(initialValue);
  // 수정 화면은 두 모드로 나뉜다 (툴바의 123 버튼으로 오간다).
  //   켜짐 - 단축키만 듣는다. 글자는 들어가지 않고, 자리를 고치는 손질
  //          (빈칸·줄바꿈·지우기)과 붙여넣기만 통과시킨다. 어느 글자가 명령이고
  //          어느 글자가 글인지 헷갈릴 일이 없다.
  //   꺼짐 - 평범한 입력칸. 숫자도 e·q·c·x(ㄷ·ㅂ·ㅊ·ㅌ)도 그냥 쳐진다.
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  // 단축키 모드라도 글자가 들어와야 하는 순간이 있다 - 마크업 버튼, 되돌리기,
  // 붙여넣기·오려두기. 그 짧은 동안만 이 문을 열어 둔다.
  //
  // 입력칸을 readOnly 로 닫아 두는 길도 있었지만, 그러면 커서가 아예 사라진다 -
  // 깜빡이지도 않고 화살표로 움직이지도 않아, 마크업을 걸 자리를 마우스로만 짚어야 했다.
  // 그래서 칸은 평범한 입력칸으로 두고, 들어오려는 글자를 문턱에서 돌려보낸다.
  const allowInputRef = useRef(false);

  // 브라우저가 알아서 처리하는 입력(빈칸·지우기·붙여넣기)은 이 keydown/beforeinput 다음에
  // 일어난다. 그래서 문을 열어 두었다가 한 박자 뒤에 닫는다.
  const openGateBriefly = useCallback(() => {
    allowInputRef.current = true;
    setTimeout(() => { allowInputRef.current = false; }, 0);
  }, []);

  // 들어오려는 입력을 문턱에서 가린다.
  //
  // 리액트의 onBeforeInput 은 합성 이벤트라 inputType 이 없어, 무엇을 하려는 입력인지
  // 알 수 없다 (글자를 넣는 건지 지우는 건지 구분이 안 된다). 그래서 진짜 beforeinput 을
  // 직접 듣는다.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const gate = (event: Event) => {
      if (!shortcutsEnabled || allowInputRef.current) return;
      const input = event as InputEvent;
      // 글자는 막되 자리를 고치는 손질은 통과시킨다 - 빈칸을 넣고, 줄을 바꾸고,
      // 지우고, 낱말째 지우는 것(Ctrl+Backspace)까지. 글을 쓰는 일이 아니라 이미
      // 있는 글의 자리를 다듬는 일이라, 단축키 모드에서도 손이 가는 자리다.
      const erasing = input.inputType?.startsWith("delete") ?? false;
      const spacing = input.inputType === "insertText" && input.data === " ";
      const breaking = input.inputType === "insertLineBreak" || input.inputType === "insertParagraph";
      if (erasing || spacing || breaking) { openGateBriefly(); return; }
      event.preventDefault();
    };
    textarea.addEventListener("beforeinput", gate);
    return () => textarea.removeEventListener("beforeinput", gate);
  }, [shortcutsEnabled, textareaRef, openGateBriefly]);

  const allowInputOnce = useCallback((run: () => void) => {
    allowInputRef.current = true;
    try {
      run();
    } finally {
      allowInputRef.current = false;
    }
  }, []);

  const handleChange = useCallback((next: string) => {
    setValue(next);
    onChange(next);
  }, [onChange]);

  // textarea.value 를 리액트에서 바로 바꾸면 브라우저가 갖고 있던 되돌리기(Ctrl+Z) 기록이
  // 끊긴다. execCommand("insertText") 는 실제 타이핑처럼 처리되어 되돌리기가 그대로 이어진다.
  // 이 명령을 못 쓰는 환경에서는 예전처럼 직접 값을 바꿔 기능은 살려 둔다.
  const insertAtCursor = useCallback((_ta: HTMLTextAreaElement, text: string) => {
    // 버튼으로 넣는 것은 사람이 친 글자가 아니므로 단축키 모드에서도 들여보낸다.
    let inserted = false;
    allowInputOnce(() => {
      try {
        inserted = document.execCommand("insertText", false, text);
      } catch {
        // 아래 대체 경로로 넘어간다
      }
    });
    return inserted;
  }, [allowInputOnce]);

  // 선택한 글을 여는·닫는 표시로 감싼다. 줄 일부만 골라도 그 줄(들) 전체를 감싼다
  // - 줄바꿈 사이까지 선택을 넓힌 뒤 감싼다 (네 마크업 모두 줄 단위 표시라 이렇게 한다).
  const wrapSelection = useCallback((open: string, close: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const start = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    const nextBreak = value.indexOf("\n", ta.selectionEnd);
    const end = nextBreak === -1 ? value.length : nextBreak;
    const selected = value.slice(start, end);

    // 열고 닫는 표시를 한 번에 넣어야 되돌리기(Ctrl+Z) 한 번으로 통째로 없어진다
    // (따로 두 번 넣으면 되돌리기도 두 번 해야 한다).
    ta.setSelectionRange(start, end);
    if (insertAtCursor(ta, open + selected + close)) {
      const afterOpen = start + open.length;
      ta.setSelectionRange(afterOpen, afterOpen + selected.length);
      handleChange(ta.value);
      return;
    }

    const next = value.slice(0, start) + open + selected + close + value.slice(end);
    handleChange(next);
    const newStart = start + open.length;
    const newEnd = end + open.length;
    // 값이 화면에 반영된 다음에야 커서를 옮길 수 있다.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });
  }, [value, handleChange, insertAtCursor, textareaRef]);

  // 루비는 낱말을 감싸지 않고 그 뒤에 { } 를 붙인다 (단어{뜻} 문법).
  // 고른 글이 있으면 그 글 뒤에 바로 { } 를 붙인다 - {} 앞은 공백 없는 한 덩어리만
  // 낱말로 잡히므로, 고른 글 안의 빈칸은 "-"로 이어 붙인다 (표시할 때는 다시 빈칸으로 보인다).
  // 고른 글이 없으면 지금 커서 자리에 빈 { } 만 넣는다.
  const insertRubySlot = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    // 고른 글 앞뒤의 빈칸은 떼어 두었다가 그대로 되돌려 놓는다.
    // 앞 빈칸까지 먹어 버리면 앞 낱말과 "{" 가 붙어 버려, "{" 앞의 한 덩어리로
    // 잡히는 낱말이 앞 낱말까지 늘어난다 (" 실용성보다" 를 골랐는데 그 앞 글자까지
    // 루비가 얹히던 까닭).
    const raw = value.slice(start, end);
    const lead = /^\s*/.exec(raw)![0];
    const tail = lead.length < raw.length ? /\s*$/.exec(raw)![0] : "";
    // 따옴표는 루비 낱말에 낄 자리가 없다 - '읽기(Reading)' 처럼 감싸 둔 것을 골라도
    // 따옴표를 걷어내고 읽기{Reading} 이 되게, 고른 글 앞뒤의 따옴표를 먼저 뗀다.
    const selected = stripQuotes(raw.slice(lead.length, raw.length - tail.length));
    // 이미 "낱말(뜻)" 처럼 괄호로 적어 둔 것은 괄호만 중괄호로 바꿔 준다 -
    // 옮겨 적은 글은 대개 이 꼴이라, 지웠다 다시 치지 않아도 되게 한다.
    //
    // 고른 글 전체가 딱 "낱말(뜻)" 하나면 낱말이 여러 마디여도 "-"로 이어 한 덩어리로 만든다
    // (괄호가 하나뿐일 때만 - 괄호가 둘 이상 섞여 있으면 아래 갈래에서 낱낱이 바꾼다).
    // 그렇지 않으면 고른 글 안에 섞여 있는 "낱말(뜻)" 만 찾아 바꾸고 나머지는 그대로 둔다
    // ("여가(Leisure)와" 처럼 조사가 붙어 있거나, 한 문장에 여럿 있는 경우).
    const wholeParenthesized = selected.match(/^([^(（)）]+?)\s*[(（]\s*([^)）]*?)\s*[)）]$/);
    // 괄호 앞 낱말은 빈칸·괄호·중괄호·따옴표가 없는 한 덩어리로 본다 (이미 바꾼 것을 또
    // 건드리지 않는다). 낱말을 감싼 따옴표는 함께 걷어낸다 - 한 문장에 여럿이 섞여 있어도
    // ('읽기(Reading)'와 '쓰기(Writing)') 낱말만 깔끔하게 남는다.
    const inlineParenthesized = selected.replace(
      new RegExp(`${QUOTE}?([^\\s(（{}${QUOTE_CHARS}]+)\\s*[(（]\\s*([^)）]*?)\\s*[)）]${QUOTE}?`, "g"),
      (_, base: string, note: string) => `${base}{${note}}`);

    let insertText: string;
    let caretOffset: number;
    if (wholeParenthesized) {
      const base = wholeParenthesized[1].replace(/\s+/g, "-");
      insertText = `${base}{${wholeParenthesized[2]}}`;
      caretOffset = insertText.length; // 뜻까지 채워졌으니 커서는 뒤에 둔다
    } else if (inlineParenthesized !== selected) {
      insertText = inlineParenthesized;
      caretOffset = insertText.length;
    } else {
      const word = selected.replace(/\s+/g, "-");
      insertText = word ? `${word}{ }` : "{ }";
      caretOffset = word ? word.length + 1 : 1;
    }

    // 떼어 둔 앞뒤 빈칸을 붙여 원래 자리의 띄어쓰기를 지킨다
    insertText = lead + insertText + tail;
    caretOffset += lead.length;

    ta.setSelectionRange(start, end);
    if (insertAtCursor(ta, insertText)) {
      ta.setSelectionRange(start + caretOffset, start + caretOffset);
      handleChange(ta.value);
      return;
    }

    const next = value.slice(0, start) + insertText + value.slice(end);
    handleChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + caretOffset, start + caretOffset);
    });
  }, [value, handleChange, insertAtCursor, textareaRef]);

  // 고른 글 안의 마크업 기호([[ ]], [ ], > <, >> <<, 낱말{루비})를 한 번에 지운다.
  // 이 앱에서 "[", "]", ">", "<" 는 오직 이 표시로만 쓰이므로, 통째로 지워도
  // 본문 내용은 그대로 남는다 - 여러 문단에 걸친 인용을 한 번에 걷어낼 때 쓴다.
  // 루비는 낱말 자체가 아니라 그 뒤에 덧붙는 주석이므로, { } 를 내용째 지운다.
  // 이때 루비 때문에 낱말 안에 넣어 뒀던 "-"(빈칸 대신 쓴 것)도 다시 빈칸으로 돌려놓는다.
  const clearMarkup = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return; // 고른 글이 없으면 아무 일도 하지 않는다

    const cleaned = value.slice(start, end)
      .split("\n")
      .map((line) => line
        .replace(/(\S+)\{[^}]*\}/g, (_, word: string) => word.replace(/-/g, " "))
        .replace(/[[\]<>]/g, "")
        .trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n"); // 표시만 있던 줄이 지워지며 생긴 빈 줄을 정리한다

    ta.setSelectionRange(start, end);
    if (insertAtCursor(ta, cleaned)) {
      ta.setSelectionRange(start, start + cleaned.length);
      handleChange(ta.value);
      return;
    }

    const next = value.slice(0, start) + cleaned + value.slice(end);
    handleChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, start + cleaned.length);
    });
  }, [value, handleChange, insertAtCursor, textareaRef]);

  // 숫자키 1~6 단축키 - 아래 툴바 버튼들과 같은 순서(제목·부분강조·대화·말씀·루비·지우기)로 잡는다.
  // e 는 수정을 마치고 나간다 (읽기 화면에서 e 로 들어온 것과 짝을 이룬다).
  // 본문에 숫자나 영어 e 를 쳐야 할 때는 옆의 단축키 버튼을 꺼서 평범한 입력으로 되돌린다.
  const DIGIT_SHORTCUT_ACTIONS: Record<string, () => void> = {
    "1": () => wrapSelection(MARKUP_BUTTONS[0].open, MARKUP_BUTTONS[0].close),
    "2": () => wrapSelection(MARKUP_BUTTONS[1].open, MARKUP_BUTTONS[1].close),
    "3": () => wrapSelection(MARKUP_BUTTONS[2].open, MARKUP_BUTTONS[2].close),
    "4": () => wrapSelection(MARKUP_BUTTONS[3].open, MARKUP_BUTTONS[3].close),
    "5": insertRubySlot,
    "6": clearMarkup,
    // 7 은 마크업이 아니라 모드 바꾸기 - 단축키 모드에서는 글자가 들어가지 않으므로,
    // 입력으로 돌아가려면 손을 떼고 123 버튼을 눌러야 했다. 그 자리를 키로도 연다.
    // (입력 모드에서는 이 자리가 그냥 숫자 7 이다 - 연도를 치다가 모드가 바뀌면 곤란하다.
    //  그때 다시 단축키 모드로 가려면 123 버튼을 누른다.)
    "7": () => setShortcutsEnabled((prev) => !prev),
  };

  const textStyle: CSSProperties = {
    fontSize,
    lineHeight,
    fontFamily: "inherit",
    fontWeight: 600,
    textAlign: "center",
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    letterSpacing: "normal",
    margin: 0,
    padding: 0,
    border: "none",
  };

  const lines = highlightSourceLines(value);
  const lineSpeechKinds = resolveLineSpeechKinds(value);
  // 같은 판이 이어지는 줄들을 하나로 묶는다 (판 하나에 배경 하나)
  const lineGroups: { kind: SpeechKind; start: number; end: number }[] = [];
  lineSpeechKinds.forEach((kind, i) => {
    const last = lineGroups[lineGroups.length - 1];
    if (last && last.kind === kind) last.end = i;
    else lineGroups.push({ kind, start: i, end: i });
  });

  return (
    <div className="w-full" style={{ margin: `${marginY}px 0` }}>
      {/* 글자 선택 표시가 불투명하면 뒤에 깔린 색칠 글자가 가려진다 */}
      <style>{`.source-editor::selection { background-color: ${colors.categorySelected}66; }`}</style>

      {/* 마크업 버튼 - 고른 글을 감싼다. 누를 때 textarea 가 초점을 잃지 않아야
          selectionStart/End 가 그대로 남는다 (mousedown 을 막아 초점 이동을 막는다).
          아래 textarea 와 같은 자리(relative 상자)에 두면 절대위치 textarea 가
          이 버튼들 위까지 덮어 눌리지 않으므로, 자리를 아예 나눠 둔다.
          sticky 로 스크롤 영역 위쪽에 붙여, 본문을 내려도 화면 밖으로 사라지지 않게 한다.
          배경은 버튼 묶음 크기만큼만 둥글게 둬서 - 화면 전체 폭을 덮는 네모난 띠가
          아니라 다른 버튼들처럼 알약 모양 판으로 붙어 있게 한다. */}
      <div className="sticky top-0 z-10 mb-2 flex justify-center">
        <div
          role="toolbar"
          aria-label="마크업 삽입"
          className="flex flex-wrap justify-center gap-1.5 rounded-2xl border px-2 py-1.5 shadow-sm"
          style={{ backgroundColor: colors.bg, borderColor: colors.border }}
        >
          {MARKUP_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              aria-label={btn.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => wrapSelection(btn.open, btn.close)}
              className="rounded-lg px-2 py-1 font-mono text-xs font-semibold"
              style={{ backgroundColor: colors.bg, color: btn.color(colors), border: `1px solid ${colors.border}` }}
            >
              {btn.label}
            </button>
          ))}
          {/* 루비는 낱말을 감싸지 않고 뒤에 { } 를 붙이므로 다른 버튼과 동작이 달라 따로 둔다 */}
          <button
            type="button"
            title="루비 (선택한 낱말 뒤에 { } 를 붙인다) - 5"
            aria-label="루비"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertRubySlot}
            className="rounded-lg px-2 py-1 font-mono text-xs font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.textEmphasis, border: `1px solid ${colors.border}` }}
          >
            {"{ }"}
          </button>
          {/* 고른 글 안의 마크업을 한 번에 지운다 - 다른 버튼처럼 표시를 더하지 않고 없앤다 */}
          <button
            type="button"
            title="고른 글의 마크업 지우기 ([[ ]], [ ], > <, >> <<, 낱말{루비}) - 6"
            aria-label="마크업 지우기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearMarkup}
            className="rounded-lg px-2 py-1"
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
              <path d="M22 21H7" />
              <path d="m5 11 9 9" />
            </svg>
          </button>
          {/* 단축키 모드 ↔ 입력 모드를 오가는 버튼. 평소엔 눌린 채로(단축키만 듣고 글자는
              들어가지 않는다) 있다가, 글을 쳐야 할 때 눌러서 끄면 평범한 입력칸이 된다. */}
          <button
            type="button"
            title={shortcutsEnabled
              ? "단축키만 듣는 중 - 글자는 들어가지 않아요 (빈칸·줄바꿈·지우기는 됩니다 / 7 또는 눌러서 입력으로 바꾸기)"
              : "입력 중 (눌러서 단축키만 듣게 하기)"}
            aria-label="단축키만 듣기 / 입력하기"
            aria-pressed={shortcutsEnabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShortcutsEnabled((prev) => !prev)}
            className="rounded-lg px-2 py-1 font-mono text-xs font-semibold"
            style={shortcutsEnabled
              ? { backgroundColor: colors.categorySelected, color: colors.categorySelectedText, border: `1px solid ${colors.categorySelected}` }
              : { backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >
            123
          </button>
        </div>
      </div>

      <div className="relative w-full">
        {/* 뒤에 깔리는 색칠 글 - 이 높이가 곧 입력칸의 높이가 된다 */}
        <div aria-hidden className="pointer-events-none" style={{ ...textStyle, color: colors.text }}>
          {lineGroups.map((group, gi) => {
            const groupLines = lines.slice(group.start, group.end + 1).map((tokens, li) => (
              <SourceLine key={group.start + li} tokens={tokens} colors={colors} />
            ));
            if (group.kind === "plain") return <Fragment key={gi}>{groupLines}</Fragment>;
            return <div key={gi} style={speechBlockStyle(group.kind, colors)}>{groupLines}</div>;
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          // 단축키 모드의 문턱은 두 겹이다. 하나는 위 effect 의 beforeinput 이고,
          // 여기 onChange 는 한글 조합처럼 그것으로 못 막는 길의 마지막 빗장이다 -
          // 값을 그대로 두면 리액트가 칸을 원래 글로 되돌려 놓는다.
          onDrop={(e) => { if (shortcutsEnabled) e.preventDefault(); }}
          onChange={(e) => {
            if (shortcutsEnabled && !allowInputRef.current) return;
            handleChange(e.target.value);
          }}
          onKeyDown={(e) => {
            // 단축키 모드에서만 듣는다. 이때 입력칸은 readOnly 라, 여기서 맡지 않은
            // 글자는 저절로 들어가지 않는다 - 한 자씩 막아 세울 필요가 없다
            // (붙여넣기나 한글 조합처럼 keydown 으로는 막기 어려운 길도 함께 닫힌다).
            // 숫자키 1~6 은 위 마크업 버튼들, e 는 수정 마치기, c 는 카테고리 옮기기,
            // x 는 삭제다. 글자를 치려면 옆의 123 버튼을 눌러 끄면 된다.
            if (!shortcutsEnabled) return;

            // 되돌리기·다시하기. 읽기 전용 입력칸은 브라우저가 이 둘을 듣지 않으므로
            // (글자를 못 넣는 칸이니 되돌릴 것도 없다고 본다) 여기서 직접 부른다 -
            // 마크업 버튼으로 고친 것은 단축키 모드에서도 되돌릴 수 있어야 한다.
            const withCtrl = e.ctrlKey || e.metaKey;
            const isUndo = withCtrl && e.code === "KeyZ" && !e.shiftKey;
            const isRedo = withCtrl && (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey));
            if (isUndo || isRedo) {
              const ta = textareaRef.current;
              if (!ta) return;
              e.preventDefault();
              e.stopPropagation();
              allowInputOnce(() => {
                try {
                  document.execCommand(isUndo ? "undo" : "redo");
                } catch {
                  // 이 명령을 못 쓰는 환경에서는 조용히 넘어간다 (되돌릴 길이 없다)
                }
              });
              handleChange(ta.value);
              return;
            }

            // 붙여넣기·오려두기는 읽기 전용이 막는다. 넣을 때와 같이 그 한 순간만 풀어 준다
            // (붙은 값은 input 이벤트를 타고 저절로 따라온다). 복사는 읽기 전용에서도 되므로
            // 손댈 것이 없다.
            if (withCtrl && (e.code === "KeyV" || e.code === "KeyX")) {
              openGateBriefly();
              return;
            }

            // Ctrl/⌘·Alt 를 곁들인 나머지는 브라우저 몫이다 - 복사(⌘C)·전체 선택(⌘A) 이
            // 여기서 c(카테고리 옮기기)·x(삭제) 로 잡히면 누르는 사람 뜻과 정반대가 된다.
            if (withCtrl || e.altKey) return;

            // q 는 읽기 화면에서 '새 글 등록' 자리라, 수정 중에 눌러도 아무 일이 없어야 한다.
            if (e.code === "KeyQ") {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            // e 는 자판 위치(e.code)로 잡는다 - 한글 자판이 켜져 있으면 e.key 가 "ㄷ" 로
            // 나와 이름만 보면 눌러도 반응하지 않는다. 숫자는 한글 자판에서도 그대로다.
            // 수정 중에만 쓰는 자리들 - e 마치기, c 카테고리 옮기기, x 삭제.
            // 모두 자판 위치(e.code)로 잡는다.
            const CODE_SHORTCUT_ACTIONS: Record<string, () => void> = {
              KeyE: onExitEdit,
              KeyC: onMoveCategory,
              KeyX: onDelete,
            };
            const action = CODE_SHORTCUT_ACTIONS[e.code] ?? DIGIT_SHORTCUT_ACTIONS[e.key];
            if (!action) return;
            e.preventDefault();
            // e 로 수정을 마치면 이 글자가 화면 전체의 키보드 단축키(e = 수정 진입)에도
            // 그대로 전달돼, 상태가 바뀐 걸 보고 곧바로 다시 수정 모드로 들어가 버린다.
            // 버블링을 여기서 끊어 이 keydown 이 그 위로 넘어가지 않게 한다.
            e.stopPropagation();
            action();
          }}
          spellCheck={false}
          aria-label="원문"
          className="source-editor absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent outline-none"
          style={{
            ...textStyle,
            color: "transparent",
            WebkitTextFillColor: "transparent", // iOS 사파리는 color 만으로 글자가 숨지 않는다
            caretColor: colors.textEmphasis,
            WebkitAppearance: "none",
          }}
        />
      </div>
    </div>
  );
}
