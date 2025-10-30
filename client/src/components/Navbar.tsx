
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between">
        <Link href="/" className="text-xl font-bold">
          Andar Bahar
        </Link>
        <div>
          {user ? (
            <>
              {user.role === "admin" ? (
                <>
                  <Link href="/admin" className="mr-4">
                    Admin Dashboard
                  </Link>
                  <Link href="/admin-game" className="mr-4">
                    Game Control
                  </Link>
                  <Link href="/user-admin" className="mr-4">
                    User Management
                  </Link>
                </>
              ) : (
                <Link href="/play" className="mr-4">
                  Play Game
                </Link>
              )}
              <Link href="/profile" className="mr-4">
                Profile
              </Link>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="mr-4">
                Login
              </Link>
              <Link href="/signup" className="mr-4">
                Signup
              </Link>
              <Link href="/admin-login">Admin Login</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
