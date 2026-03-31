import { useEffect, useState } from "react";
import { api } from "../api/api";
import { Employee } from "../types";

export default function EmployeeSelector({ onSelect }: any) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    api.get("/employees").then(res => setEmployees(res.data));
  }, []);

  return (
    <select onChange={e => onSelect(e.target.value)}>
      <option>Select Employee</option>
      {employees.map(e => (
        <option key={e.id} value={e.employeeNumber}>
          {e.name}
        </option>
      ))}
    </select>
  );
}