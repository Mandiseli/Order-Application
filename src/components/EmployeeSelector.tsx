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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get<Employee[]>("/employees");

        if (mounted) {
          setEmployees(response.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load employees:", err);

        if (mounted) {
          setError("Failed to load employees.");
          setEmployees([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="employee-selector">
      <label htmlFor="employee-select" className="selector-label">
        Employee
      </label>

      <select
        id="employee-select"
        className="input"
        defaultValue=""
        disabled={loading}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">
          {loading ? "Loading employees..." : "-- Select Employee --"}
        </option>

        {employees.map((employee) => (
          <option
            key={employee.id}
            value={employee.employeeNumber}
          >
            {employee.name} ({employee.employeeNumber}) - R
            {Number(employee.balance ?? 0).toFixed(2)}
          </option>
        ))}
      </select>

      {error && (
        <small className="error-message">
          {error}
        </small>
      )}
    </div>
  );
}