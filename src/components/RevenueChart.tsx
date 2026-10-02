interface Point { month: string; revenue: number }

const data: Point[] = [
  { month: "Jan", revenue: 5000 },
  { month: "Feb", revenue: 7000 },
  { month: "Mar", revenue: 9000 },
  { month: "Apr", revenue: 12000 }
];

export default function RevenueChart() {
  const max = Math.max(...data.map((x) => x.revenue), 1);
  const points = data.map((x, i) => `${50 + i * 170},${230 - (x.revenue / max) * 190}`).join(" ");
  return <div className="card"><h2>Revenue Report</h2><div className="svg-chart"><svg viewBox="0 0 600 260" role="img" aria-label="Revenue line chart"><line x1="40" y1="230" x2="580" y2="230" className="axis"/><polyline points={points} fill="none" className="chart-line"/>{data.map((x, i) => <circle key={x.month} cx={50 + i * 170} cy={230 - (x.revenue / max) * 190} r="5" className="chart-dot"/> )}</svg></div><div className="chart-labels">{data.map((x) => <span key={x.month}>{x.month}: R{x.revenue.toLocaleString()}</span>)}</div></div>;
}
