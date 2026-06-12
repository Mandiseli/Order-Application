import { api } from "./api";

export const getEmployees = async () => {
  return await api.get("/employees");
};