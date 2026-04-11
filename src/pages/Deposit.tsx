import { useState } from "react";
import { api } from "../api/api";
import EmployeeSelector from "../components/EmployeeSelector";

export default function Deposit() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [amount, setAmount] = useState(0);

  const deposit = async () => {
    try {
      await api.post("/deposits", null, {
        params: { employeeNumber, amount }
      });
      alert("✅ Deposit successful");
    } catch {
      alert("❌ Failed");
    }
  };

  return (
    <div className="card">
      <h2>💰 Deposit</h2>

      <EmployeeSelector onSelect={setEmployeeNumber} />

      <input
        className="input"
        type="number"
        placeholder="Amount"
        onChange={e => setAmount(Number(e.target.value))}
      />

      <button className="button" onClick={deposit}>
        Deposit
      </button>
    </div>
  );
}