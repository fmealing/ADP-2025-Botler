import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function WelcomePage() {
  const nav = useNavigate();
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/audio/welcome.mp3");
    audioRef.current.preload = "auto";
  }, []);

  const handleStart = async () => {
    try {
      const audio = audioRef.current;
      if (!audio) throw new Error("Audio not initialized");

      audio.currentTime = 0;
      await audio.play();

      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
      });
    } catch (err) {
      console.warn("Audio play failed:", err);
    }

    nav("/menu");
  };

  return (
    <div className="flex flex-col select-none min-h-full items-center justify-center bg-blue-50 px-6 py-10 font-inter text-gray-900 text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-blue-700">
        Welcome to Nostos
      </h1>

      <p className="text-lg mb-10 text-center max-w-md text-gray-600">
        I am Botler! Please use this screen to order your meal when ready.
      </p>

      <button
        onClick={handleStart}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
      >
        Start
      </button>
    </div>
  );
}

export default WelcomePage;