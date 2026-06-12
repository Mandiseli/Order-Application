interface Props {
  employees: number;
  orders: number;
  revenue: number;
}

export default function DashboardWidgets({
  employees,
  orders,
  revenue
}: Props) {

  return (
    <div className="widgets">

      <div className="widget-card">
        <h3>Employees</h3>
        <h1>{employees}</h1>
      </div>

      <div className="widget-card">
        <h3>Orders</h3>
        <h1>{orders}</h1>
      </div>

      <div className="widget-card">
        <h3>Revenue</h3>
        <h1>R{revenue}</h1>
      </div>

    </div>
  );
}