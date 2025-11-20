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
      const res = await fetch("http://localhost:5050/users/login", {
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
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-96 text-gray-800">
        <h2 className="text-2xl font-bold text-center mb-6 text-indigo-600">User Login</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-lg text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block mb-1 font-semibold">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-gray-600">
          Don’t have an account?{" "}
          <button
            onClick={() => navigate("/user/register")}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginUser;
