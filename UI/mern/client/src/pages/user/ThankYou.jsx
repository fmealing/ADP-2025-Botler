import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
//import { useTTS } from "../../hooks/useTTS";

export default function ThankYou() {
  const nav = useNavigate();
  //const { ready, speakAsync } = useTTS({ lang: "en-GB", rate: 1.1 });
  const audioRef = useRef(null);


  useEffect(() => {
    audioRef.current = new Audio("/audio/thankyou.mp3");
    audioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      nav("/", { replace: true });
    }, 7000);
    return () => clearTimeout(t);
  }, [nav]);

  /*  useEffect(() => {
      const run = async() =>{
        const shouldPlay = localStorage.getItem("playThankYouVoice") === "1";
  
        if (shouldPlay && ready) {
          localStorage.removeItem("playThankYouVoice");
          await speakAsync("Thank you. I will return with your order shortly!");
        }
      };
      run();
  
    }, [ready, speakAsync]);
  
    Legacy code for using web TTS to announce voicelines, replaced by mp3
  
    */


  useEffect(() => {
    const run = async () => {
      const shouldPlay = localStorage.getItem("playThankYouVoice") === "1";
      if (!shouldPlay) return;

      localStorage.removeItem("playThankYouVoice");

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
    };

    run();
  }, []);

  return (
    <div className="select-none min-h-full flex items-center justify-center bg-blue-50 px-6 font-inter text-gray-900">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-blue-100 max-w-md w-full">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-blue-700">
          Thank you!
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Your order has been placed.
        </p>
      </div>
    </div>
  );
}
