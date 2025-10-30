
export interface User {
  id: string;
  phone: string;
  username: string;
  role: "player" | "admin";
  token: string;
}
