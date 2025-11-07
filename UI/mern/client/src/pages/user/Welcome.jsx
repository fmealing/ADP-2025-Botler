import {useNavigate} from "react-router-dom";

function WelcomePage() {
  const nav = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <h1 className="text-5xl font-bold mb-6">Welcome to Your Restaurant</h1>
      <p className="text-lg mb-10 text-center max-w-md">
        Discover our menus and order easily through your smart system.
      </p>
      <button
        onClick={() => nav("/menu")}
        className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-semibold text-lg hover:bg-indigo-100 transition"
      >
        Start
      </button>
    </div>
  );
}

export default WelcomePage;
