"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = "", width = 180, height = 40 }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always use the same logo during SSR and initial render to prevent hydration mismatch
  // Then switch to theme-appropriate logo after mount
  const logoSrc = mounted && resolvedTheme === "dark" ? "/logo-light.png" : "/logo.png";

  return (
    <Image
      src={logoSrc}
      alt="Trend Advisory"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}