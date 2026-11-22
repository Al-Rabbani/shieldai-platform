import React from "react";
import useCountUp from "@/hooks/useCountUp";

export default function AnimatedNumber({ value, decimals = 0, suffix = "", duration = 700 }) {
  const isNumeric = typeof value === "number" && !Number.isNaN(value);
  const animated = useCountUp(isNumeric ? value : 0, duration);
  if (!isNumeric) return <>{value}</>;
  return <>{animated.toFixed(decimals)}{suffix}</>;
}