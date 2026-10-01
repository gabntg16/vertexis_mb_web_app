import { httpsCallable } from 'firebase/functions';
import { auth, functions, isFirebaseConfigured } from '../../lib/firebase';
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
  content: `Welcome to VertexIS help. Ask about requisitions, receiving approvals, daily shifts or stock reports. I can explain the workflow, but I cannot access your live records or perform transactions.`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  model: 'gemini-3.5-flash',
};

export function useGeminiChat({ userRole, currentTab, branchName }: UseGeminiChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [selectedModel, setSelectedModel] = useState<GeminiModelType>('gemini-3.5-flash');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Remove the old shared history; keep conversations in this signed-in view only.
    localStorage.removeItem(STORAGE_KEY);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  }, [userRole, branchName]);

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
        'What are the package limits for Silver, Gold, and Platinum?',
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
      const uid = auth.currentUser?.uid;
      if (!isFirebaseConfigured || !uid) throw new Error('Sign in to use the assistant.');
      const ask = httpsCallable<unknown, { reply: string; model: GeminiModelType }>(functions, 'assistantChat');
      const data = (await ask({ messages: newHistory.filter(m => m.id !== 'welcome-0' && !m.id.startsWith('bot-err-')).slice(-20).map(m => ({ role: m.role, content: m.content })) })).data;
      if (uid !== auth.currentUser?.uid) return;
      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply || "I'm here to help with your VertexIS workflows.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: data.model || selectedModel,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');

      const errorBotMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Unable to complete AI query:** ${err?.message || 'Server error'}.\n\nPlease try again later.`,
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
