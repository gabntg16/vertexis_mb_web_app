import React, { useState } from 'react';
import { Copy, Check, Bot, User, Sparkles, Zap, Brain } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  model?: string;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isDark: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, isDark }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Helper to render formatted text with basic markdown (bold, lists, code)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Header
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-extrabold text-sm sm:text-base mt-2 mb-1 text-[#F37021] dark:text-[#80C7F2]">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }

          // Bullet item
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-[#F37021] font-bold text-xs mt-0.5">•</span>
                <span>{renderInlineStyles(bulletText)}</span>
              </div>
            );
          }

          // Numbered item
          const matchNum = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (matchNum) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="font-bold text-[#80C7F2] text-xs mt-0.5">{matchNum[1]}.</span>
                <span>{renderInlineStyles(matchNum[2])}</span>
              </div>
            );
          }

          // Empty line
          if (trimmed === '') {
            return <div key={idx} className="h-1.5" />;
          }

          // Standard paragraph
          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  // Helper for bold and inline code
  const renderInlineStyles = (text: string) => {
    // Regex for bold **text** or inline `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-bold text-neutral-900 dark:text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-neutral-200/70 dark:bg-neutral-800 text-[#F37021] dark:text-[#80C7F2] border border-neutral-300/40 dark:border-neutral-700/50"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const getModelBadge = (modelName?: string) => {
    if (!modelName) return null;
    if (modelName.includes('lite')) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
          <Zap className="w-2.5 h-2.5" />
          <span>Fast • gemini-3.1-flash-lite</span>
        </span>
      );
    }
    if (modelName.includes('pro')) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
          <Brain className="w-2.5 h-2.5" />
          <span>Pro Reasoning • gemini-3.1-pro-preview</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
        <Sparkles className="w-2.5 h-2.5" />
        <span>General • gemini-3.5-flash</span>
      </span>
    );
  };

  return (
    <div
      className={`flex items-start gap-2.5 group transition-all animate-in fade-in duration-200 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white ${
          isUser
            ? 'bg-gradient-to-br from-[#F37021] to-amber-500'
            : 'bg-gradient-to-br from-[#80C7F2] to-sky-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3 sm:p-3.5 shadow-xs ${
          isUser
            ? 'bg-[#F37021] text-white rounded-tr-xs'
            : isDark
            ? 'bg-neutral-800/90 border border-neutral-700/70 text-neutral-200 rounded-tl-xs'
            : 'bg-white border border-neutral-200/90 text-neutral-800 rounded-tl-xs'
        }`}
      >
        {/* Model & Meta Header */}
        {!isUser && (
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-neutral-200/50 dark:border-neutral-700/50">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xs text-neutral-900 dark:text-white">
                MallowBot
              </span>
              {getModelBadge(message.model)}
            </div>

            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              title="Copy answer"
              aria-label="Copy answer to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Content */}
        {renderFormattedContent(message.content)}

        {/* Footer timestamp */}
        <div
          className={`mt-1.5 text-[10px] text-right ${
            isUser ? 'text-white/70' : 'text-neutral-400 dark:text-neutral-500'
          }`}
        >
          {message.timestamp}
        </div>
      </div>
    </div>
  );
};
