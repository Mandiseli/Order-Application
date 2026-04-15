import { useEffect, useState } from "react";
import { api } from "../api/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Reports() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api.get("/reports/orders-summary")
      .then(res => setData(res.data));
  }, []);

  return (
    <div>
      <h2>Reports</h2>

      <BarChart width={400} height={300} data={data}>
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" />
      </BarChart>
    </div>
  );
}