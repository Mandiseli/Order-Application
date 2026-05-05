import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Employees from "./Employees";

test("renders Employees title", () => {
  render(<Employees />);
  const text = screen.getByText(/employees/i);
  expect(text).toBeInTheDocument();
});