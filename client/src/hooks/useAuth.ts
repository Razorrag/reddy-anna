
import { useLocalStorage } from "./useLocalStorage";
import { User } from "@/types/user";

export const useAuth = () => {
  const [user, setUser] = useLocalStorage<User | null>("user", null);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return { user, login, logout };
};
