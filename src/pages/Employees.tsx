import { useEffect, useState } from "react";
import { api } from "../api/api";
import type { Employee } from "../types";

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    api.get("/employees").then(res => setEmployees(res.data));
  }, []);

  return (
    <div>
      <h2>Employees</h2>
      {employees.map(e => (
        <div key={e.id}>
          {e.name} - R{e.balance}
        </div>
      ))}
    </div>
  );
}