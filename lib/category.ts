// 카테고리 계층
//
// 상위/하위를 시트에 새 칸을 만들지 않고 이름 한 줄에 담는다 ("공무직/헌법").
// 시트는 예전처럼 category 한 칸만 쓰므로, 이 기능 때문에 시트나 Apps Script 의
// 모양이 달라지지 않는다 - 대신 카테고리 이름 자체에는 이 구분자를 쓸 수 없다.
export const CATEGORY_SEPARATOR = "/";

// 화면에 보일 이름 - 위층은 경로 표시가 알려주므로 마지막 조각만 보여준다
export function categoryLabel(path: string): string {
  const parts = path.split(CATEGORY_SEPARATOR);
  return parts[parts.length - 1];
}

// 한 층 위 - 최상위면 null(전체)
export function parentCategory(path: string | null): string | null {
  if (!path) return null;
  const cut = path.lastIndexOf(CATEGORY_SEPARATOR);
  return cut === -1 ? null : path.slice(0, cut);
}

// 고른 자리에 이 글이 들어가는가.
// 상위를 고르면 그 아래 글까지 모두 들어간다 ("공무직"을 고르면 "공무직/헌법"도 나온다).
export function isInCategory(category: string, selected: string | null): boolean {
  if (!selected) return true;
  return category === selected || category.startsWith(selected + CATEGORY_SEPARATOR);
}

// 바로 아래 한 층의 이름들. 고르면 그대로 쓸 수 있게 전체 경로로 돌려준다
// (parent 가 null 이면 최상위 층).
export function childCategories(categories: string[], parent: string | null): string[] {
  const prefix = parent ? parent + CATEGORY_SEPARATOR : "";
  const seen = new Set<string>();
  const children: string[] = [];
  for (const full of categories) {
    if (prefix && !full.startsWith(prefix)) continue;
    const rest = full.slice(prefix.length);
    if (!rest) continue; // 상위 자신에 바로 달린 글은 아래층이 아니다
    const child = prefix + rest.split(CATEGORY_SEPARATOR)[0];
    if (seen.has(child)) continue;
    seen.add(child);
    children.push(child);
  }
  return children;
}

// 경로 표시(전체 › 공무직 › 헌법)에 쓸 조각들 - 각 조각은 그 층으로 돌아가는 자리다
export function categoryTrail(path: string | null): { label: string; path: string }[] {
  if (!path) return [];
  const parts = path.split(CATEGORY_SEPARATOR);
  return parts.map((label, i) => ({
    label,
    path: parts.slice(0, i + 1).join(CATEGORY_SEPARATOR),
  }));
}

// 이름이 바뀐 카테고리(와 그 아래 카테고리들)의 새 이름을 돌려준다.
// 상위 이름을 고치면 그 아래 것들의 앞부분도 같이 바뀐다.
export function renameCategoryPath(name: string, oldPath: string, newPath: string): string {
  if (name === oldPath) return newPath;
  if (name.startsWith(oldPath + CATEGORY_SEPARATOR)) return newPath + name.slice(oldPath.length);
  return name;
}
