"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiItem } from "@/features/dashboard/data/mock-data";
import { formatCompactNumber } from "@/lib/utils";

function AnimatedValue({ value, suffix }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 22, stiffness: 130 });
  const display = useTransform(spring, (latest) => {
    if (suffix === "%") return `${latest.toFixed(1)}%`;
    if (suffix === "$") return `$${formatCompactNumber(latest)}`;
    return formatCompactNumber(latest);
  });

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <motion.span>{display}</motion.span>;
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.04 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                <AnimatedValue value={item.value} suffix={item.suffix} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {item.delta >= 0 ? "+" : ""}
                {item.delta}% vs previous period
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
