import { useEffect, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

interface PendingDeposit {
  id: number;
  employeeName: string;
  employeeNumber: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function DepositApprovals() {
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);

  useEffect(() => {
    loadDeposits();
  }, []);

  const loadDeposits = async () => {
    try {
      const res = await api.get("/deposits/pending");
      setDeposits(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load pending deposits");
    }
  };

  const approveDeposit = async (id: number) => {
    try {
      await api.post("/deposits/approve", {
        pendingDepositId: id
      });

      toast.success("Deposit approved");
      loadDeposits();
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to approve deposit");
    }
  };

  return (
    <div>
      <h1 className="page-title">✅ Deposit Approvals</h1>

      {deposits.length === 0 ? (
        <div className="card">No pending deposits.</div>
      ) : (
        <div className="grid">
          {deposits.map((d) => (
            <div key={d.id} className="card">
              <h2>{d.employeeName}</h2>

              <p>
                <strong>Employee Number:</strong> {d.employeeNumber}
              </p>

              <p>
                <strong>Amount:</strong> R{Number(d.amount).toFixed(2)}
              </p>

              <p>
                <strong>Status:</strong> {d.status}
              </p>

              <p>
                <strong>Requested:</strong>{" "}
                {new Date(d.createdAt).toLocaleString()}
              </p>

              <button
                className="button button-success"
                onClick={() => approveDeposit(d.id)}
              >
                Approve Deposit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}