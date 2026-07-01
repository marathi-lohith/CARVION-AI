import React, { useState } from 'react';
import { FiSend } from 'react-icons/fi';
import Button from '../../../components/common/Button.jsx';

export default function InputArea({ onSend, loading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (cleanText && !loading) {
      onSend(cleanText);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={text}
        disabled={loading}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask the counselor a career question..."
        className="flex-1 px-4 py-3 rounded-2xl text-sm border bg-white text-slate-800 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all disabled:opacity-50 font-medium"
      />
      <Button
        type="submit"
        disabled={!text.trim() || loading}
        className="p-3 rounded-2xl h-11 w-11 flex items-center justify-center flex-shrink-0 font-bold"
      >
        <FiSend className="w-4 h-4 text-white" />
      </Button>
    </form>
  );
}
