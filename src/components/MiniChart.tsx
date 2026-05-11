'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export function MiniChart({ data, color, height = 40 }: MiniChartProps) {
  const isPositive = data.length >= 2 && data[data.length - 1] > data[0];
  const lineColor = color || (isPositive ? '#C8FF00' : '#FF3D00');
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="v"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
