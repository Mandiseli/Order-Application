interface Props {
  status: string;
}

const statuses = [
  "Pending",
  "Preparing",
  "Ready For Pickup",
  "Out For Delivery",
  "Delivered"
];

export default function OrderProgress({ status }: Props) {
  const currentIndex = statuses.indexOf(status);

  return (
    <div className="order-progress">
      {statuses.map((s, index) => (
        <div
          key={s}
          className={`progress-step ${index <= currentIndex ? "active" : ""}`}
        >
          <div className="progress-circle">{index + 1}</div>
          <small>{s}</small>
        </div>
      ))}
    </div>
  );
}