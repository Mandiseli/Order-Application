import { useState } from "react";
import { api } from "../api/api";
import type { Transaction } from "../types";
import EmployeeSelector from "../components/EmployeeSelector";

export default function TransactionsPage() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = async () => {
    const res = await api.get(`/transactions/${employeeNumber}`);
    setTransactions(res.data);
  };

  return (
    <div>
      <h2>💰 Transaction History</h2>

      <div className="card">
        <EmployeeSelector onSelect={setEmployeeNumber} />
        <button className="button" onClick={load}>
          Load Transactions
        </button>
      </div>

      {transactions.map(t => (
        <div key={t.id} className="card">
          <strong>{t.type}</strong>
          <p>{t.description}</p>

          <p style={{
            color: t.amount > 0 ? "green" : "red",
            fontWeight: "bold"
          }}>
            R{t.amount}
          </p>

          <small>{new Date(t.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}