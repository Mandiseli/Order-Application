import { useState } from "react";
import { api } from "../api/api";
import EmployeeSelector from "../components/EmployeeSelector";
import { toast } from "react-toastify";
import { getUserFromToken } from "../utils/auth";

export default function Deposit() {
  const user = getUserFromToken();

  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState("");
  const [amount, setAmount] = useState(0);

  const employeeNumber =
    user?.role === "Employee"
      ? user.employeeNumber
      : selectedEmployeeNumber;

  const requestDeposit = async () => {
    if (!employeeNumber) {
      toast.error("Select an employee");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    try {
      await api.post("/deposits/request", {
        employeeNumber,
        amount
      });

      toast.success("Deposit request submitted for approval");
      setAmount(0);
    } catch (error: any) {
      toast.error(error.response?.data || "Deposit request failed");
    }
  };

  return (
    <div className="card">
      <h2>💰 Request Deposit</h2>

      {user?.role !== "Employee" && (
        <EmployeeSelector onSelect={setSelectedEmployeeNumber} />
      )}

      {user?.role === "Employee" && (
        <p>
          <strong>Employee:</strong> {user.employeeNumber}
        </p>
      )}

      <input
        className="input"
        type="number"
        value={amount || ""}
        placeholder="Enter amount"
        onChange={(e) => setAmount(Number(e.target.value))}
      />

      <button className="button button-success" onClick={requestDeposit}>
        Submit Deposit Request
      </button>
    </div>
  );
}