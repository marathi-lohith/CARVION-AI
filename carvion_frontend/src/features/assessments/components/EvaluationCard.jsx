import React from 'react';
import Card from '../../../components/common/Card.jsx';
import { FiCheck, FiX, FiCpu, FiAward, FiBookOpen, FiActivity } from 'react-icons/fi';

export default function EvaluationCard({ question, index, totalQuestions = 4, coaching = null }) {
  if (!question) return null;

  const isCorrect = question.is_correct || false;
  const options = question.options || [];
  const selectedIdx = question.selected_option;
  const correctIdx = question.correct_answer;

  return (
    <Card
      hoverable={false}
      className={`border text-left p-6 transition-all bg-white relative rounded-2xl shadow-sm ${
        isCorrect
          ? 'border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/5'
          : 'border-red-200 border-l-4 border-l-red-500 bg-red-50/5'
      }`}
    >
      {/* Title / Correct Indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">
            Question {index + 1} of {totalQuestions}
          </span>
          <h4 className="font-extrabold text-sm text-slate-800 leading-relaxed pt-0.5">
            {question.question}
          </h4>
        </div>

        <span className={`w-8 h-8 rounded-full text-white shadow-sm flex-shrink-0 flex items-center justify-center ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {isCorrect ? <FiCheck className="w-4.5 h-4.5" /> : <FiX className="w-4.5 h-4.5" />}
        </span>
      </div>

      {/* Graded Options List */}
      <div className="space-y-2.5 pt-2">
        {options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrectAnswer = correctIdx === idx;

          let optionStyle = 'border-slate-200 text-slate-650 bg-white hover:bg-slate-50/40 font-medium';
          let bulletStyle = 'border-slate-300 text-slate-400 bg-slate-50';

          if (isCorrectAnswer) {
            optionStyle = 'border-emerald-500 bg-emerald-50/30 text-emerald-700 font-bold';
            bulletStyle = 'bg-emerald-500 border-emerald-500 text-white';
          } else if (isSelected && !isCorrectAnswer) {
            optionStyle = 'border-red-400 bg-red-50/30 text-red-750 font-bold';
            bulletStyle = 'bg-red-500 border-red-500 text-white';
          }

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${optionStyle}`}
            >
              <div className="flex items-center space-x-3 min-w-0 pr-3">
                <span className={`w-5.5 h-5.5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border ${bulletStyle}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="truncate">{option}</span>
              </div>
              
              {isCorrectAnswer && (
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-250 flex-shrink-0">
                  Correct Answer
                </span>
              )}
              {isSelected && !isCorrectAnswer && (
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 border border-orange-250 flex-shrink-0">
                  User Selected
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Rich AI Explanation */}
      <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4.5 border border-slate-205 dark:border-slate-800 space-y-3.5">
        <h5 className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest flex items-center space-x-1.5">
          <FiCpu className="text-orange-500 w-4 h-4" />
          <span>AI Explanation & Coaching</span>
        </h5>
        
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-355 leading-relaxed font-medium">
          {/* Why Selected Answer is Incorrect */}
          {!isCorrect && (
            <div className="bg-red-50/40 p-3.5 rounded-xl border border-red-100 text-red-750">
              <strong className="text-red-800 block mb-1 font-bold">Why Your Selected Answer is Incorrect:</strong>
              {coaching?.why_incorrect || "The selected choice misses key runtime constraints, semantic declarations, or API specifications of this concept."}
            </div>
          )}

          <div className="bg-white/90 p-3.5 rounded-xl border border-slate-150 shadow-xs">
            <strong className="text-slate-800 block mb-1 font-bold">Why the Correct Answer is Correct:</strong>
            {coaching?.why_correct || question.rationale}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-3 rounded-xl bg-orange-50/30 border border-orange-150">
              <strong className="text-orange-700 block mb-1 font-bold flex items-center gap-1.5">
                <FiAward className="w-3.5 h-3.5" /> Common Misconception
              </strong>
              {coaching?.misconception || "Focusing on immediate syntactic rules instead of evaluating runtime resource scopes and context parameters."}
            </div>
            <div className="p-3 rounded-xl bg-sky-50/20 border border-sky-150">
              <strong className="text-sky-700 block mb-1 font-bold flex items-center gap-1.5">
                <FiBookOpen className="w-3.5 h-3.5" /> Interview Tip
              </strong>
              {coaching?.interview_tip || "Demonstrate understanding of resource optimizations, edge cases handling, and clean error catching procedures."}
            </div>
          </div>

          {coaching?.real_world_example && (
            <div className="p-3.5 rounded-xl bg-slate-100/50 border border-slate-200 text-slate-600 flex items-start gap-2">
              <FiActivity className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-slate-700 block mb-0.5 font-bold">Real-World Case Study:</strong>
                {coaching.real_world_example}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
