import { useEffect, useState } from "react";
import { api } from "../api/api";

interface Employee {
  id: number;
  name: string;
  employeeNumber: string;
  balance: number;
}

interface Props {
  onSelect: (employeeNumber: string) => void;
}

export default function EmployeeSelector({ onSelect }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    api.get<Employee[]>("/employees")
      .then((res) => {
        console.log("Employees loaded:", res.data);
        setEmployees(res.data);
      })
      .catch((err) => {
        console.error("Failed to load employees:", err);
      });
  }, []);

  return (
    <select
      className="input"
      onChange={(e) => onSelect(e.target.value)}
      defaultValue=""
    >
      <option value="">-- Select Employee --</option>

      {employees.map((emp) => (
        <option key={emp.id} value={emp.employeeNumber}>
          {emp.name} ({emp.employeeNumber}) - R{Number(emp.balance).toFixed(2)}
        </option>
      ))}
    </select>
  );
}