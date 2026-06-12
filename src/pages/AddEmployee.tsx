import { useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

export default function AddEmployee() {
  const [name, setName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  const createEmployee = async () => {
    if (!name.trim()) return toast.error("Employee name is required");
    if (!employeeNumber.trim()) return toast.error("Employee number is required");

    try {
      await api.post("/employees", {
        name,
        employeeNumber,
        balance: 0,
        lastDepositMonth: new Date().toISOString()
      });

      toast.success("Employee created successfully");

      setName("");
      setEmployeeNumber("");
    } catch (error: any) {
      console.error("Create employee error:", error);
      toast.error(error.response?.data || "Failed to create employee");
    }
  };

  return (
    <div className="card">
      <h1 className="page-title">Add Employee</h1>

      <label>Employee Name</label>
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Example: Thabo Mokoena"
      />

      <label>Employee Number</label>
      <input
        className="input"
        value={employeeNumber}
        onChange={(e) => setEmployeeNumber(e.target.value)}
        placeholder="Example: EMP003"
      />

      <button className="button" onClick={createEmployee}>
        Create Employee
      </button>
    </div>
  );
}