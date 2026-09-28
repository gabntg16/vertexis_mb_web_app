import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessageItem';

const STORAGE_KEY = 'vertexis_chat_history_v1';

export type GeminiModelType = 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview';

interface UseGeminiChatOptions {
  userRole?: string;
  currentTab?: string;
  branchName?: string;
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-0',
  role: 'model',
  content: `👋 **Welcome to VertexIS AI Copilot!**\n\nI am **MallowBot**, your operational assistant for Marsh Bites Gourmet Marshmallow Enterprise.\n\nAsk me anything about:\n- **Frontline Counting & Audits**: Daily physical shelf counts & variance tracking.\n- **Wholesale Requisitions**: Made-to-order packages (Silver, Gold, Platinum) & flavor limits.\n- **Predictive Analytics**: Single Exponential Smoothing (α=0.3) & Reorder Points.\n- **Logistics & QA**: 4-stage commissary tracking & spoilage reporting.\n\nSelect a topic below or type your question!`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  model: 'gemini-3.5-flash',
};

export function useGeminiChat({ userRole, currentTab, branchName }: UseGeminiChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [selectedModel, setSelectedModel] = useState<GeminiModelType>('gemini-3.5-flash');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Dynamic starter prompts tailored to role & active tab
  const getSuggestions = useCallback(() => {
    if (userRole === 'super_admin') {
      return [
        'How does commissary 4-stage batch production tracking work?',
        'How are nationwide franchise orders validated and dispatched?',
        'Explain Single Exponential Smoothing demand forecasting (α=0.3)',
        'How do I export the orders report spreadsheet?',
      ];
    }
    if (userRole === 'branch_manager') {
      return [
        'What are the package limits for Silver (50), Gold (100), and Platinum (200)?',
        'How do I review and validate frontline staff shift counts?',
        'How does AI Demand Auto-Fill calculate flavor allocations?',
        'What are the storage and spoilage criteria for gourmet marshmallows?',
      ];
    }
    // Branch Staff
    return [
      'How do I record today’s physical inventory shelf count?',
      'What are the valid reasons for logging spoilage/wastage?',
      'How do I record offline or manual cash sales?',
      'What steps are required to close and lock my shift summary?',
    ];
  }, [userRole]);

  // Send a message in multi-turn conversation
  const sendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Call server-side /api/chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          userRole,
          currentTab,
          branchName,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply || "I'm here to help with your VertexIS workflows.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: data.model || selectedModel,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err?.message || 'Failed to send message.');

      const errorBotMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Unable to complete AI query:** ${err?.message || 'Server error'}.\n\nPlease try again or switch model mode.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return {
    messages,
    sendMessage,
    clearHistory,
    selectedModel,
    setSelectedModel,
    isLoading,
    error,
    suggestions: getSuggestions(),
  };
}
