import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// --- UI Helper Components ---

const Footer = () => (
  <footer className="w-full py-3 bg-black/30 backdrop-blur-sm text-center text-gray-400 text-sm z-20">
    Made with ❤️ by Rohit Gehlot — 
    <a href="https://github.com/rohit-web01" target="_blank" rel="noopener noreferrer" className="underline hover:text-white mx-1">GitHub</a> |
    <a href="https://linkedin.com/in/rohit-web" target="_blank" rel="noopener noreferrer" className="underline hover:text-white mx-1">LinkedIn</a> |
    <a href="https://my-portfolio-tau-nine-13.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white mx-1">Portfolio</a> |
    <a href="https://www.instagram.com/rohit.web/" target='_blank' className="underline hover:text-white mx-1">Instagram</a>
  </footer>
);

const Instructions = ({ onStartGame }) => (
    <div className="w-full max-w-4xl bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center flex flex-col items-center animate-fade-in z-10">
      <h1 className="text-5xl font-bold text-white mb-4">Gesture RPS</h1>
      <p className="text-xl text-gray-300 mb-8">The classic game, controlled by your hands.</p>
      <div className="flex flex-col md:flex-row justify-around w-full mb-8 text-white">
        <div className="mb-6 md:mb-0">
          <h2 className="text-3xl font-semibold text-white mb-4">How to Play</h2>
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center"><span className="text-7xl mb-2">✊</span><p className="text-lg">Rock</p></div>
            <div className="flex flex-col items-center"><span className="text-7xl mb-2">✋</span><p className="text-lg">Paper</p></div>
            <div className="flex flex-col items-center"><span className="text-7xl mb-2">✌️</span><p className="text-lg">Scissors</p></div>
          </div>
        </div>
        <div className="border-t-2 md:border-t-0 md:border-l-2 border-gray-600 pt-6 md:pt-0 md:pl-8">
           <h2 className="text-3xl font-semibold text-white mb-4">Game Rules</h2>
           <ul className="text-lg text-gray-300 text-left list-disc list-inside">
              <li>Rock crushes Scissors</li><li>Paper covers Rock</li><li>Scissors cuts Paper</li><li className="mt-2 text-gray-400">Game is best of 5 rounds.</li>
           </ul>
        </div>
      </div>
      <button onClick={onStartGame} className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-xl text-2xl transition-transform transform hover:scale-105 shadow-lg">Start Game</button>
    </div>
);

const HistoryTable = ({ history }) => (
  <div className="w-full bg-gray-900/80 backdrop-blur-sm rounded-2xl p-2 md:p-4 shadow-lg flex-grow flex flex-col min-h-0">
    <h3 className="text-lg md:text-xl font-bold text-white text-center mb-2">Round History</h3>
    <div className="overflow-auto flex-grow">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
          <tr><th scope="col" className="px-2 py-1 md:px-4 md:py-2">R</th><th scope="col" className="px-2 py-1 md:px-4 md:py-2">You</th><th scope="col" className="px-2 py-1 md:px-4 md:py-2">CPU</th><th scope="col" className="px-2 py-1 md:px-4 md:py-2">Winner</th></tr>
        </thead>
        <tbody>
          {[...history].reverse().map((item) => (
            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30">
              <td className="px-2 py-1 font-medium">{item.round}</td><td className="px-2 py-1 text-xl md:text-2xl">{item.player}</td><td className="px-2 py-1 text-xl md:text-2xl">{item.computer}</td>
              <td className={`px-2 py-1 font-semibold text-xs md:text-sm ${item.winner === 'Player' ? 'text-green-400' : item.winner === 'CPU' ? 'text-red-400' : 'text-yellow-400'}`}>{item.winner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const GameOver = ({ score, onResetGame }) => {
    const winnerText = score.player > score.computer ? "You are the Champion!" : score.computer > score.player ? "The Computer Wins!" : "It's a Draw!";
    const winnerColor = score.player > score.computer ? "text-green-400" : score.computer > score.player ? "text-red-400" : "text-yellow-400";
  return (
    <div className="w-full max-w-4xl bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-10 text-center flex flex-col items-center animate-fade-in z-10">
      <h1 className="text-5xl font-bold text-white mb-4">Game Over</h1><h2 className={`text-4xl font-bold mb-6 ${winnerColor}`}>{winnerText}</h2>
      <p className="text-2xl text-gray-200 mb-8">Final Score: <span className="text-white font-bold">{score.player}</span> - <span className="text-white font-bold">{score.computer}</span></p>
      <button onClick={onResetGame} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-xl text-2xl transition-transform transform hover:scale-105 shadow-lg">Play Again</button>
    </div>
  );
};

const ChoiceDisplay = ({ title, choice, bgColor }) => (
    <div className={`w-full ${bgColor} rounded-2xl p-2 md:p-4 flex flex-col items-center justify-center shadow-inner h-28 md:h-48 transition-all duration-300`}>
        <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">{title}</h3><div className="text-5xl md:text-7xl animate-fade-in">{choice || '?'}</div>
    </div>
);

// --- Gesture Detection Component ---
const GestureDetector = ({ onGestureDetected }) => {
    const videoRef = useRef(null);
    const animationFrameRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const [status, setStatus] = useState('Loading models...');
    
    const onGestureDetectedRef = useRef(onGestureDetected);
    onGestureDetectedRef.current = onGestureDetected;

    const detectGestureFromLandmarks = (landmarks) => {
        if (!landmarks || landmarks.length === 0) return null;
        const lms = landmarks[0];
        const thumbIsOpen = lms[4].x < lms[3].x;
        const indexIsOpen = lms[8].y < lms[6].y;
        const middleIsOpen = lms[12].y < lms[10].y;
        const ringIsOpen = lms[16].y < lms[14].y;
        const pinkyIsOpen = lms[20].y < lms[18].y;
        const totalFingers = [indexIsOpen, middleIsOpen, ringIsOpen, pinkyIsOpen].filter(Boolean).length;
        if (totalFingers === 4 && thumbIsOpen) return 'Paper';
        if (totalFingers === 2 && indexIsOpen && middleIsOpen) return 'Scissors';
        if (totalFingers === 0 && !thumbIsOpen) return 'Rock';
        return null;
    };

    const predictWebcam = useCallback(() => {
        if (videoRef.current && handLandmarkerRef.current) {
            const video = videoRef.current;
            if (video.readyState >= 3) {
                const results = handLandmarkerRef.current.detectForVideo(video, Date.now());
                if (results.landmarks) {
                    const gesture = detectGestureFromLandmarks(results.landmarks);
                    if (gesture) onGestureDetectedRef.current(gesture);
                }
            }
        }
        animationFrameRef.current = requestAnimationFrame(predictWebcam);
    }, []);

    useEffect(() => {
        async function setup() {
            try {
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, delegate: "GPU" },
                    runningMode: "VIDEO", numHands: 1
                });
                handLandmarkerRef.current = handLandmarker;
                setStatus('Waiting for webcam...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.addEventListener('loadeddata', () => {
                         predictWebcam();
                         setStatus('Ready');
                    });
                }
            } catch (error) {
                console.error("Setup failed:", error);
                setStatus('Error! Please enable webcam.');
            }
        }
        setup();
        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [predictWebcam]);

    return (
        <div className="w-full h-full bg-black rounded-2xl shadow-lg relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scaleX(-1)"></video>
            {status !== 'Ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 z-10">
                    <p className="text-white font-semibold text-lg text-center">{status}</p>
                    {status.includes('Error') && (
                        <p className="text-gray-300 text-sm text-center mt-2">
                            Please check your browser settings to allow camera access and then refresh the page.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Main App Component ---
export default function App() {
  const [gameState, setGameState] = useState('instructions');
  const [history, setHistory] = useState([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [roundResult, setRoundResult] = useState(null);

  const choiceMap = { 'Rock': '✊', 'Paper': '✋', 'Scissors': '✌️' };
  const choices = ['Rock', 'Paper', 'Scissors'];
  const playerChoiceRef = useRef(null);

  const handleGestureDetected = useCallback((gesture) => {
    if (gameState === 'player_turn' && !playerChoiceRef.current) {
      playerChoiceRef.current = gesture;
      const cpuMove = choices[Math.floor(Math.random() * choices.length)];
      resolveRound(gesture, cpuMove);
    }
  }, [gameState, choices, round]); // Added round dependency for correct history

  const resolveRound = useCallback((playerMove, cpuMove) => {
    setGameState('reveal');
    setPlayerChoice(choiceMap[playerMove]);
    setComputerChoice(choiceMap[cpuMove]);
    let winner = '';
    let resultText;
    const currentRound = round; // Capture current round for history

    if (!playerMove) { 
      winner = 'CPU';
      resultText = <span>No gesture! <span className="text-red-400">CPU wins.</span></span>;
    } else if (playerMove === cpuMove) { 
      winner = 'Tie';
      resultText = <span>It's a Tie! Both chose {choiceMap[playerMove]}</span>;
    } else if ((playerMove === 'Rock' && cpuMove === 'Scissors') || (playerMove === 'Paper' && cpuMove === 'Rock') || (playerMove === 'Scissors' && cpuMove === 'Paper')) {
      winner = 'Player'; 
      setScore(s => ({ ...s, player: s.player + 1 }));
      resultText = <span>You win! {choiceMap[playerMove]} beats {choiceMap[cpuMove]}</span>;
    } else { 
      winner = 'CPU'; 
      setScore(s => ({ ...s, computer: s.computer + 1 }));
      resultText = <span>CPU wins! {choiceMap[cpuMove]} beats {choiceMap[playerMove]}</span>;
    }
    
    setHistory(h => [...h, { id: `${currentRound}-${Date.now()}`, round: currentRound, player: choiceMap[playerMove] || '?', computer: choiceMap[cpuMove], winner }]);
    setRoundResult(resultText);
  }, [round, choiceMap]);

  useEffect(() => {
    let timerId;
    if (gameState === 'reveal') {
      timerId = setTimeout(() => {
        if (round >= 5) { setGameState('game_over');
        } else {
          setRound(r => r + 1); 
          setPlayerChoice(null); 
          setComputerChoice(null); 
          setRoundResult(null); 
          playerChoiceRef.current = null;
          setGameState('player_turn');
        }
      }, 1200);
    }
    return () => clearTimeout(timerId);
  }, [gameState, round]);

  const resetGame = () => {
    setGameState('instructions'); setHistory([]); setRound(1); setScore({ player: 0, computer: 0 }); setPlayerChoice(null); setComputerChoice(null); setRoundResult(null);
  };

  const renderGameStatus = () => {
      switch(gameState) {
          case 'player_turn': return <h3 className="text-lg md:text-2xl font-semibold text-yellow-300 animate-pulse">Your Turn! Show your gesture...</h3>;
          case 'reveal': return <h3 className="text-lg md:text-2xl font-semibold text-green-300 animate-fade-in">{roundResult}</h3>;
          default: return <h3 className="text-2xl font-semibold">&nbsp;</h3>;
      }
  };

  const GameUI = () => (
    <div className="w-full h-full flex flex-col z-10 p-2 sm:p-4">
      {/* DESKTOP LAYOUT */}
      <div className="w-full flex-grow hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        <div className="flex flex-col gap-6"><GestureDetector onGestureDetected={handleGestureDetected} /><ChoiceDisplay title="Your Move" choice={playerChoice} bgColor="bg-blue-900/50" /></div>
        <div className="flex flex-col justify-between items-center text-white gap-6">
            <div className="text-center"><h2 className="text-4xl font-bold">Round {round}</h2><p className="text-lg text-gray-300">Best of 5</p></div>
            <div className="text-center bg-gray-900/80 py-2 px-6 rounded-xl shadow-lg"><p className="text-5xl font-mono tracking-widest">{score.player} : {score.computer}</p><p className="text-xs text-gray-400">SCORE</p></div>
            <div className="h-16 text-center flex items-center justify-center">{renderGameStatus()}</div>
        </div>
        <div className="flex flex-col gap-6"><ChoiceDisplay title="Computer's Move" choice={computerChoice} bgColor="bg-red-900/50" /><HistoryTable history={history} /></div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="w-full flex-grow flex flex-col lg:hidden gap-3 min-h-0">
        <div className="grid grid-cols-2 gap-3 flex-grow">
          <div className="flex flex-col gap-3"><GestureDetector onGestureDetected={handleGestureDetected} /><ChoiceDisplay title="Your Move" choice={playerChoice} bgColor="bg-blue-900/50" /></div>
          <div className="flex flex-col gap-3"><ChoiceDisplay title="Computer's Move" choice={computerChoice} bgColor="bg-red-900/50" /><HistoryTable history={history} /></div>
        </div>
        <div className="flex-shrink-0 grid grid-cols-2 gap-3 items-center text-white">
            <div className="text-center bg-gray-900/80 p-2 rounded-xl shadow-lg">
                <p className="text-2xl font-mono tracking-widest">{score.player} : {score.computer}</p>
                <p className="text-xs text-gray-400">SCORE - RND {round}</p>
            </div>
            <div className="h-12 text-center flex items-center justify-center">{renderGameStatus()}</div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (gameState) {
      case 'instructions': 
        return <div className="p-4"><Instructions onStartGame={() => setGameState('player_turn')} /></div>;
      case 'game_over': 
        return <GameOver score={score} onResetGame={resetGame} />;
      default: 
        return <GameUI />;
    }
  };
  
  const showHeaderFooter = gameState !== 'instructions' && gameState !== 'game_over';

  return (
    <main className="font-sans w-full h-screen flex flex-col text-white overflow-hidden animated-bg">
      <style>{`
        @keyframes gradient-animation { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animated-bg { background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); background-size: 400% 400%; animation: gradient-animation 25s ease infinite; }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
      
      {showHeaderFooter && (
        <header className="w-full py-3 bg-black/30 backdrop-blur-sm shadow-lg z-20">
          <h1 className="text-center text-3xl md:text-4xl font-bold text-white uppercase tracking-widest">Rock Paper Scissor</h1>
        </header>
      )}

      <div className="flex-grow w-full flex items-center justify-center min-h-0">
         {renderContent()}
      </div>

      {showHeaderFooter && <Footer />}
    </main>
  );
}

