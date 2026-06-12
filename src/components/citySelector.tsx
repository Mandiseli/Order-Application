import { cities } from "../data/cities";

interface Props {
  onSelect: (city: string) => void;
}

export default function CitySelector({ onSelect }: Props) {
  return (
    <select
      className="input"
      defaultValue=""
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">-- Select City --</option>

      {cities.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}