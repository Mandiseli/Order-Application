import { BrowserRouter, Routes, Route } from "react-router-dom";
import Employees from "./pages/Employees";
import Deposit from "./pages/Deposit";
import Restaurants from "./pages/Restaurants";
import Orders from "./pages/Orders";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Employees />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/restaurants" element={<Restaurants />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;