"use client";

import Image from "next/image";

interface LogoLightProps {
  className?: string;
  width?: number;
  height?: number;
}

export function LogoLight({ className = "", width = 180, height = 40 }: LogoLightProps) {
  return (
    <Image
      src="/logo-light.png"
      alt="Trend Advisory"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}