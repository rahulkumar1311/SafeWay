import React, { useState } from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  Award, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const rulesCategories = [
  { id: 'drowsiness', label: 'Drowsiness Laws' },
  { id: 'signs', label: 'Road Signs Guide' },
  { id: 'speed', label: 'Speed Limits' }
];

const rulesData = {
  drowsiness: [
    { title: 'Mandatory Rest Break', text: 'Drivers exhibiting drowsiness symptoms must pull over for at least 20 minutes.' },
    { title: 'Legal EAR Threshold', text: 'Eye Aspect Ratio (EAR) under 0.20 for 3 seconds constitutes impaired driving.' },
    { title: 'Autonomous Deceleration', text: '5-second unresponsive timeout legally requires autonomous safe-shoulder stopping.' }
  ],
  signs: [
    { title: 'Rest Area Ahead', text: 'Blue highway sign indicating 24/7 parking and rest facilities.' },
    { title: 'Emergency Shoulder Only', text: 'Restricts stopping strictly to emergencies or severe driver fatigue.' }
  ],
  speed: [
    { title: 'Highway Speed Limit (70 MPH)', text: 'Standard highway maximum speed under optimal clear conditions.' }
  ]
};

const quizQuestions = [
  {
    question: 'What is the critical Eye Aspect Ratio (EAR) threshold for drowsiness?',
    options: ['EAR < 0.45', 'EAR < 0.20', 'EAR < 0.05', 'EAR < 0.80'],
    correct: 1
  },
  {
    question: 'How long does the Stage 1 in-car alarm countdown run before pull-over?',
    options: ['10 seconds', '5 seconds', '30 seconds', '60 seconds'],
    correct: 1
  }
];

export const TrafficRulesScreen = () => {
  const [activeTab, setActiveTab] = useState('drowsiness');
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const handleSelectOption = (idx) => {
    setSelectedOption(idx);
    if (idx === quizQuestions[quizIndex].correct) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex(i => i + 1);
      setSelectedOption(null);
    } else {
      setQuizComplete(true);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizComplete(false);
    setShowQuiz(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Traffic & Drowsiness Regulations</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Highway laws and driver safety guidelines</p>
          </div>
        </div>

        <button
          onClick={() => setShowQuiz(true)}
          className="glass-button text-xs py-2.5 px-4 shadow-lg shadow-cyan-500/20"
        >
          <Award className="w-4 h-4 text-cyan-300" />
          <span>TAKE SAFETY QUIZ</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2">
        {rulesCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === cat.id ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rulesData[activeTab].map((rule, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-2xl space-y-2">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>{rule.title}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{rule.text}</p>
          </div>
        ))}
      </div>

      {/* Quiz Modal */}
      {showQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="glass-panel max-w-lg w-full p-6 sm:p-8 rounded-3xl space-y-6 relative border-cyan-500/40">
            
            {!quizComplete ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 font-mono">QUESTION {quizIndex + 1} OF {quizQuestions.length}</span>
                  <button onClick={resetQuiz} className="text-xs text-slate-400 hover:text-white font-mono">✕ CLOSE</button>
                </div>

                <h3 className="text-lg font-extrabold text-white">
                  {quizQuestions[quizIndex].question}
                </h3>

                <div className="space-y-2.5">
                  {quizQuestions[quizIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(i)}
                      className={`w-full p-3.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        selectedOption === i 
                          ? i === quizQuestions[quizIndex].correct
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-red-950 border-red-500 text-red-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {selectedOption !== null && (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full glass-button justify-center py-3 text-xs font-black shadow-lg"
                  >
                    <span>NEXT QUESTION</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <Award className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
                <h3 className="text-2xl font-black text-white">QUIZ COMPLETED!</h3>
                <p className="text-sm text-cyan-300 font-mono">Score: {score} / {quizQuestions.length} Correct</p>
                <button onClick={resetQuiz} className="glass-button justify-center py-3 px-6 text-xs mx-auto">
                  <span>DONE</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
