import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Zap,
  Brain,
  Trash2,
  Maximize2,
  Minimize2,
  Bot,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { useGeminiChat, GeminiModelType } from './useGeminiChat';
import { ChatMessageItem } from './ChatMessageItem';

interface MallowChatbotProps {
  userRole?: string;
  currentTab?: string;
  branchName?: string;
  themeMode?: 'light' | 'dark';
}

export const MallowChatbot: React.FC<MallowChatbotProps> = ({
  userRole,
  currentTab,
  branchName,
  themeMode = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = themeMode === 'dark';

  const {
    messages,
    sendMessage,
    clearHistory,
    selectedModel,
    setSelectedModel,
    isLoading,
    suggestions,
  } = useGeminiChat({
    userRole,
    currentTab,
    branchName,
  });

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    sendMessage(text);
  };

  const handleSuggestionClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Floating Trigger Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#F37021] to-[#80C7F2] text-white font-black shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer active:scale-95"
            aria-label="Open MallowBot AI Copilot"
            title="Ask MallowBot AI Assistant"
          >
            <div className="relative">
              <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
            </div>
            <span className="text-xs tracking-wide">Ask MallowBot AI</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[9px] bg-white/20 uppercase tracking-wider font-extrabold">
              Gemini
            </span>
          </button>
        </div>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col shadow-2xl border ${
            isExpanded
              ? 'inset-3 sm:inset-6 rounded-3xl'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[460px] h-[580px] max-h-[88vh] rounded-3xl'
          } ${
            isDark
              ? 'bg-[#141414] border-neutral-800 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
          }`}
        >
          {/* Header */}
          <div className="shrink-0 p-3.5 sm:p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-transparent via-[#80C7F2]/10 to-transparent rounded-t-3xl">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#80C7F2] to-sky-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm tracking-tight">MallowBot AI</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[200px] sm:max-w-none">
                  VertexIS Enterprise Copilot
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={clearHistory}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title="Clear conversation history"
                aria-label="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title={isExpanded ? 'Restore window size' : 'Expand window'}
                aria-label="Toggle window size"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="border-b border-neutral-200 px-4 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">Workflow guidance only. The assistant cannot view live records or approve transactions.</p>

          {/* Messages Scrollable Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} isDark={isDark} />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/60 max-w-[80%] text-xs text-neutral-500">
                <div className="w-6 h-6 rounded-lg bg-[#80C7F2]/20 text-[#80C7F2] flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="flex items-center space-x-1.5">
                  <span>MallowBot is thinking</span>
                  <span className="flex space-x-0.5">
                    <span className="w-1.5 h-1.5 bg-[#80C7F2] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-[#80C7F2] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[#80C7F2] rounded-full animate-bounce" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {suggestions.length > 0 && (
            <div className="shrink-0 px-3.5 py-2 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/40 dark:bg-neutral-900/30 overflow-x-auto flex items-center space-x-2 scrollbar-none">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
                <HelpCircle className="w-3 h-3" />
                <span>Suggestions:</span>
              </span>
              {suggestions.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleSuggestionClick(sug)}
                  disabled={isLoading}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-2xs'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer Form */}
          <form
            onSubmit={handleSend}
            className="shrink-0 p-3 sm:p-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center space-x-2 bg-neutral-50/70 dark:bg-neutral-900/50 rounded-b-3xl"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about inventory, requisitions, forecasting..."
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-hidden focus:ring-2 focus:ring-[#80C7F2] transition-all ${
                isDark
                  ? 'bg-neutral-800/90 border-neutral-700 text-white placeholder-neutral-500'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400'
              }`}
            />

            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F37021] to-[#80C7F2] text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
