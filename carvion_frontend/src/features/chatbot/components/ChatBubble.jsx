import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiUser, FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto relative border border-slate-800">
      <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-400 mb-2 border-b border-slate-800 pb-1">
        <span>{lang || 'code'}</span>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1 hover:text-white transition focus:outline-none"
        >
          {copied ? (
            <>
              <FiCheck className="text-green-500" /> Copied
            </>
          ) : (
            <>
              <FiCopy /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="whitespace-pre overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownRenderer({ text }) {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : 'code';
          const code = match ? match[2].trim() : part.slice(3, -3).trim();

          return <CodeBlock key={index} code={code} lang={lang} />;
        } else {
          return <TextPart key={index} text={part} />;
        }
      })}
    </div>
  );
}

function TextPart({ text }) {
  const lines = text.split('\n');
  const renderedElements = [];
  let currentListItems = [];

  const renderInlineStyles = (txt) => {
    const tokens = txt.split(/(\*\*.*?\*\*|`.*?`)/g);
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-800">{token.slice(2, -2)}</strong>;
      } else if (token.startsWith('`') && token.endsWith('`')) {
        return <code key={i} className="bg-slate-100 text-red-500 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200">{token.slice(1, -1)}</code>;
      }
      return token;
    });
  };

  lines.forEach((line, index) => {
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
    if (isBullet) {
      const content = line.trim().replace(/^[-*]\s+/, '');
      currentListItems.push(
        <li key={index} className="list-disc ml-5 mt-1 leading-relaxed text-xs">
          {renderInlineStyles(content)}
        </li>
      );
    } else {
      if (currentListItems.length > 0) {
        renderedElements.push(<ul key={`list-${index}`} className="my-2 space-y-1">{[...currentListItems]}</ul>);
        currentListItems = [];
      }

      if (line.trim() !== '') {
        renderedElements.push(
          <p key={index} className="my-1.5 leading-relaxed text-xs md:text-sm">
            {renderInlineStyles(line)}
          </p>
        );
      }
    }
  });

  if (currentListItems.length > 0) {
    renderedElements.push(<ul key="list-end" className="my-2 space-y-1">{[...currentListItems]}</ul>);
  }

  return <div className="text-slate-650">{renderedElements}</div>;
}

export default function ChatBubble({ message, index, onCopy, onRegenerate }) {
  if (!message) return null;

  const isBot = message.sender === 'bot';

  return (
    <motion.div
      className={`flex w-full items-start space-x-3 py-1 ${isBot ? 'justify-start' : 'justify-end space-x-reverse'}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar Icons */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
        isBot ? 'bg-slate-700' : 'bg-orange-500'
      }`}>
        {isBot ? <FiCpu className="w-4 h-4 text-white" /> : <FiUser className="w-4 h-4 text-white" />}
      </div>

      {/* Message Text Panel */}
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm font-medium ${
        isBot
          ? 'bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] text-slate-700 rounded-tl-sm'
          : 'bg-orange-500 text-white rounded-tr-sm'
      }`}>
        {isBot ? (
          <div>
            <MarkdownRenderer text={message.text} />
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
              <button 
                onClick={() => onCopy && onCopy(message.text)} 
                className="flex items-center gap-1 hover:text-slate-600 transition focus:outline-none"
              >
                <FiCopy /> Copy
              </button>
              {onRegenerate && (
                <button 
                  onClick={() => onRegenerate && onRegenerate(index)} 
                  className="flex items-center gap-1 hover:text-slate-600 transition focus:outline-none"
                >
                  <FiRefreshCw /> Regenerate
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-line">{message.text}</div>
        )}
      </div>
    </motion.div>
  );
}
