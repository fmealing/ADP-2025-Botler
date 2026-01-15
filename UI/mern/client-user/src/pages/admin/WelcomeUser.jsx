import { useNavigate } from "react-router-dom";

function WelcomePageUser() {
  const nav = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 px-6 py-10 font-inter text-gray-900 text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-blue-700">
        Welcome to Botler Control Centre
      </h1>
      <p className="text-lg mb-10 text-center max-w-md text-gray-600">
        View your Botler waiters, add new users, and more!
      </p>
      <button
        onClick={() => nav("login")}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
      >
        Start
      </button>
    </div>
  );
}

export default WelcomePageUser;
