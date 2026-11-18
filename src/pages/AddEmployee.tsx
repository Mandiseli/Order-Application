import { useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

export default function AddEmployee() {
  const [name, setName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const createEmployee = async () => {
    if (!name.trim()) return toast.error("Employee name is required");
    if (!employeeNumber.trim()) return toast.error("Employee number is required");

    try {
      await api.post("/employees", {
        name,
        employeeNumber,
        email: email.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        balance: 0,
        lastDepositMonth: new Date().toISOString()
      });

      toast.success("Employee created successfully");

      setName("");
      setEmployeeNumber("");
      setEmail("");
      setPhoneNumber("");
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

      <label>Employee Email (for notifications)</label>
      <input className="input" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="employee@example.com" />

      <label>Employee Phone Number (international format, e.g. +27...)</label>
      <input className="input" type="tel" value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+27 82 123 4567" />

      <button className="button" onClick={createEmployee}>
        Create Employee
      </button>
    </div>
  );
}