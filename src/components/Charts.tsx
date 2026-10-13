import { useMemo } from 'react';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showAxis?: boolean;
  formatValue?: (v: number) => string;
}

export function LineChart({ data, height = 200, color = '#2563eb', showAxis = true, formatValue }: LineChartProps) {
  const width = 600;
  const padding = { top: 20, right: 16, bottom: showAxis ? 32 : 8, left: showAxis ? 44 : 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, maxVal, minVal } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value));
    const min = Math.min(...data.map((d) => d.value));
    const range = max - min || 1;
    const pts = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - ((d.value - min) / range) * chartH * 0.85 - chartH * 0.075;
      return { x, y, ...d };
    });
    return { points: pts, maxVal: max, minVal: min };
  }, [data, chartW, chartH, padding.left, padding.top]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showAxis && gridLines.map((g) => {
        const y = padding.top + g * chartH;
        const val = Math.round(maxVal - g * (maxVal - minVal));
        return (
          <g key={g}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={g === 0 || g === 1 ? '0' : '4 4'} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400" style={{ fontSize: 11 }}>
              {formatValue ? formatValue(val) : val}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
          {showAxis && (
            <text x={p.x} y={height - 10} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11 }}>
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 200, horizontal = false, formatValue }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value));
  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 text-sm text-slate-600 font-medium shrink-0">{d.label}</div>
            <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: d.color || '#2563eb' }}
              >
                <span className="text-xs font-semibold text-white whitespace-nowrap">
                  {formatValue ? formatValue(d.value) : d.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1">
          <div className="w-full flex items-end justify-center" style={{ height: height - 28 }}>
            <div
              className="w-full max-w-[40px] rounded-t-lg transition-all duration-500 hover:opacity-80 group relative"
              style={{ height: `${(d.value / maxVal) * 100}%`, backgroundColor: d.color || '#2563eb', minHeight: d.value > 0 ? '4px' : '0' }}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                {formatValue ? formatValue(d.value) : d.value}
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ data, size = 180, thickness = 28, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          {data.map((d, i) => {
            const fraction = total > 0 ? d.value / total : 0;
            const dash = fraction * circumference;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return seg;
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-2xl font-bold text-slate-900">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-slate-500 mt-0.5">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-slate-600 font-medium">{d.label}</span>
            <span className="text-sm text-slate-400 ml-auto">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({ value, max, size = 120, thickness = 10, color, label }: ProgressRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(value / max, 1);
  const dash = fraction * circumference;
  const status = value <= 5 ? 'Empty' : value <= 20 ? 'Critical' : value <= 50 ? 'Low' : 'Normal';
  const strokeColor = color || (value <= 5 ? '#ef4444' : value <= 20 ? '#f97316' : value <= 50 ? '#f59e0b' : '#10b981');

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{value}</span>
          <span className="text-xs text-slate-400">/ {max}</span>
        </div>
      </div>
      {label && <span className="text-sm font-medium mt-1.5" style={{ color: strokeColor }}>{label}</span>}
      {label && <span className="text-xs text-slate-400">{status}</span>}
    </div>
  );
}
