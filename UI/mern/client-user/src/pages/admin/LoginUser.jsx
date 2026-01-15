import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // keep token and user info in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/pages/admin/control"); // you can change this to any admin page
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-50 px-6 py-10 font-inter text-gray-900">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100 w-full max-w-md text-gray-900">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-10 text-blue-700">
          User Login
        </h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-4 rounded-xl text-center mb-6 text-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold text-lg">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-lg">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-4 rounded-xl font-semibold text-white text-lg transition ${loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginUser;
