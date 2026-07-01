import React, { useState, useEffect } from 'react';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import { FiArrowRight, FiArrowLeft, FiSend, FiClock } from 'react-icons/fi';

export default function QuizInterface({ test, onSubmit, loading }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState({}); // { question_id: selected_index }
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes default

  const questions = test?.questions || [];
  const currentQuestion = questions[currentIdx];

  // Timer Countdown loop
  useEffect(() => {
    if (secondsLeft <= 0) {
      handleSubmitQuiz();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (optIdx) => {
    setSelections((prev) => ({
      ...prev,
      [currentQuestion.id]: optIdx,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    // Compile answers format: [{"question_id": X, "selected_option": Y}]
    const payload = Object.entries(selections).map(([qId, val]) => ({
      question_id: parseInt(qId),
      selected_option: val,
    }));
    
    // Autofill uncompleted questions as index -1
    questions.forEach((q) => {
      if (selections[q.id] === undefined) {
        payload.push({
          question_id: q.id,
          selected_option: -1,
        });
      }
    });

    const duration = 600 - secondsLeft;
    onSubmit({ answers: payload, duration });
  };

  if (questions.length === 0) return null;

  return (
    <div className="space-y-6 w-full text-left">
      {/* Quiz Header Stats */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-sm font-bold text-slate-400">
          Question {currentIdx + 1} of {questions.length}
        </div>
        <div className="flex items-center space-x-1.5 text-orange-555 font-bold text-sm bg-orange-50 px-3.5 py-1.5 rounded-xl border border-orange-100">
          <FiClock className="w-4 h-4 animate-pulse text-orange-550" />
          <span>{formatTime(secondsLeft)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
        <div
          className="bg-orange-500 h-full transition-all duration-350"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <Card hoverable={false} className="p-6 space-y-6 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)]">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 leading-relaxed">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Options list */}
        <div className="space-y-3">
          {currentQuestion.options?.map((option, idx) => {
            const isSelected = selections[currentQuestion.id] === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 rounded-xl border text-sm font-bold transition-all duration-200 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/40 text-orange-700 shadow-sm scale-[1.005]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                    isSelected
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-slate-300 text-slate-400 bg-white'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center">
        <Button variant="secondary" onClick={handlePrev} disabled={currentIdx === 0} className="font-bold">
          <FiArrowLeft className="w-4 h-4 mr-1.5 text-slate-500" /> Previous
        </Button>

        {currentIdx === questions.length - 1 ? (
          <Button variant="primary" onClick={handleSubmitQuiz} loading={loading} className="font-bold">
            <span>Submit Assessment</span>
            <FiSend className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button variant="primary" onClick={handleNext} disabled={selections[currentQuestion.id] === undefined} className="font-bold">
            <span>Next Question</span>
            <FiArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
