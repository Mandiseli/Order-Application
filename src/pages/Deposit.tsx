import { useState } from "react";
import { toast } from "react-toastify";

import { api } from "../api/api";

import EmployeeSelector from "../components/EmployeeSelector";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Deposit() {

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [amount, setAmount] = useState(0);

  const [loading, setLoading] = useState(false);

  const deposit = async () => {

    if (!employeeNumber) {
      toast.error("Please select employee");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {

      setLoading(true);

      await api.post("/deposits", null, {
        params: {
          employeeNumber,
          amount
        }
      });

      toast.success("Deposit successful");

      setAmount(0);

    } catch {

      toast.error("Deposit failed");

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="card">

      <h1 className="page-title">
        💰 Deposit Funds
      </h1>

      <div
        style={{
          marginTop: "20px"
        }}
      >

        <label>
          Select Employee
        </label>

        <EmployeeSelector onSelect={setEmployeeNumber} />

      </div>

      <div
        style={{
          marginTop: "20px"
        }}
      >

        <label>
          Deposit Amount
        </label>

        <input
          className="input"
          type="number"
          value={amount}
          placeholder="Enter amount"
          onChange={e => setAmount(Number(e.target.value))}
        />

      </div>

      <div
        style={{
          marginTop: "20px"
        }}
      >

        <button
          className="button"
          onClick={deposit}
          disabled={loading}
        >

          {loading ? "Processing..." : "Deposit"}

        </button>

      </div>

      {loading && <LoadingSpinner />}

    </div>
  );
}