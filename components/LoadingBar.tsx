"use client";

import { useEffect, useRef, useState } from "react";
import { DharmaWheel } from "./DharmaWheel";
import type { ThemeColors } from "@/lib/theme";

interface LoadingBarProps {
  // 받은 양 (0~1). null 이면 얼마나 오는지 모른다는 뜻.
  progress: number | null;
  // 글이 다 준비되었는가 - 여기서부터 막대가 끝까지 달린다.
  done: boolean;
  // 막대가 끝까지 찬 뒤에 부른다 (그때 첫 화면을 치운다).
  onFinished: () => void;
  colors: ThemeColors;
}

// 막대가 목표까지 다가가는 빠르기 (초당, 남은 거리에 곱한다).
// 받는 동안은 느릿느릿, 다 준비된 뒤에는 시원하게 달린다.
const CREEP_SPEED = 0.9;
const FINISH_SPEED = 6;
// 받는 동안은 여기까지만 찬다 - 나머지는 CSV 를 풀고 첫 화면을 그리는 몫이다.
// 다 받자마자 100% 가 되어 버리면, 정작 남은 기다림이 막대에 안 잡힌다.
const DOWNLOAD_SHARE = 0.9;

// 첫 화면의 로딩 막대.
//
// 받은 양을 그대로 너비에 넣으면, 캐시가 있거나 304 로 끝나는 흔한 경우에 받을 것이
// 없어 한 번에 꽉 차 버린다. 그래서 '지금 값'과 '보이는 값'을 나누고, 보이는 값이
// 목표를 향해 매 프레임 조금씩 다가가게 한다. 남은 거리에 비례해 움직이므로
// 처음엔 쑥 나갔다가 끝으로 갈수록 느려진다 - 멈춘 것처럼 보이지 않으면서도
// 실제보다 빨리 끝난 척하지 않는다.
export function LoadingBar({ progress, done, onFinished, colors }: LoadingBarProps) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const progressRef = useRef(progress);
  const doneRef = useRef(done);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { doneRef.current = done; }, [done]);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // 다른 탭에 가 있다 돌아오면 사이가 크게 벌어진다 - 한 걸음에 다 건너뛰지 않게 자른다.
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;

      const finished = doneRef.current;
      const received = progressRef.current;
      const target = finished
        ? 1
        : (received === null ? DOWNLOAD_SHARE : Math.min(received, 1) * DOWNLOAD_SHARE);

      const speed = finished ? FINISH_SPEED : CREEP_SPEED;
      const current = shownRef.current;
      let next = current + (target - current) * Math.min(1, speed * seconds);
      if (finished && 1 - next < 0.005) next = 1;

      shownRef.current = next;
      setShown(next);

      if (next >= 1) { onFinishedRef.current(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const percent = Math.round(shown * 100);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8" style={{ backgroundColor: colors.bg }}>
      <div role="img" aria-label="법륜">
        <DharmaWheel size={160} color={colors.buttonIcon} />
      </div>
      <div
        className="h-[3px] w-40 overflow-hidden rounded-full"
        style={{ backgroundColor: colors.border }}
        role="progressbar"
        aria-label="글 불러오는 중"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full" style={{ backgroundColor: colors.textMuted, width: `${percent}%` }} />
      </div>
    </div>
  );
}
