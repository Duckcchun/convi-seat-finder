import React from "react";

export function Logo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="편의점 좌석 찾기 로고"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
}
