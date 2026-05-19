import { useEffect, useState } from "react";
import { api } from "../api/api";

export default function Employees() {

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await api.get("/employees");
    setEmployees(res.data);
  };

  return (
    <div>

      <h1 className="page-title">
        Employees
      </h1>

      <div className="grid grid-3">

        {employees.map(emp => (

          <div key={emp.id} className="card">

            <h2>
              {emp.name}
            </h2>

            <p>
              Employee #: {emp.employeeNumber}
            </p>

            <h3
              style={{
                marginTop: "15px",
                color: "green"
              }}
            >
              R{emp.balance}
            </h3>

          </div>

        ))}

      </div>

    </div>
  );
}