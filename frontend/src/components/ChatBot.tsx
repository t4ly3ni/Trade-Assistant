import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { sendChatMessage, type ChatRequest, type ChatResponse, type ChatMessage } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatBotProps {
  investorName?: string;
  investorProfile?: string;
  investmentAmount?: number;
  /** Pre-fill with a stock ticker to focus analysis */
  focusStock?: string;
}

const SUGGESTED_QUESTIONS = [
  'Quel est le meilleur investissement pour un débutant ?',
  'Analyse le marché BVMT aujourd\'hui',
  'Quels sont les risques à surveiller ?',
  'Comment diversifier mon portefeuille ?',
];

export default function ChatBot({
  investorName = 'Ahmed',
  investorProfile = 'Modere',
  investmentAmount = 5000,
  focusStock,
}: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Bonjour ${investorName} ! 👋 Je suis votre assistant d'investissement BVMT. Posez-moi vos questions sur le marché tunisien, vos positions ou une action spécifique.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Detect stock ticker from message (e.g., "analyse SFBT" → stock = "SFBT")
  // Kept for potential future use
  function extractStock(text: string): string | undefined {
    const knownTickers = [
      'SFBT', 'BIAT', 'BH', 'STB', 'ATB', 'TUNTEL', 'PGH', 'NAKL',
      'ADWYA', 'AMS', 'CELL', 'SIPHAT', 'UIB', 'AB', 'BNA', 'SOTUVER',
      'TPR', 'ARTES', 'SAH', 'SOTIPAPIER',
    ];
    const upper = text.toUpperCase();
    return knownTickers.find((t) => upper.includes(t)) || focusStock;
  }

  async function handleSend(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Add loading message
    const loadingId = `loading-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      // Build conversation history from existing messages (exclude welcome + loading)
      const history: ChatMessage[] = messages
        .filter((m) => m.id !== 'welcome' && !m.isLoading && m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add the current user message to history
      history.push({ role: 'user', content: messageText });

      const req: ChatRequest = {
        message: messageText,
        history,
        investor_name: investorName,
        investor_profile: investorProfile,
        investment_amount: investmentAmount,
      };

      const response: ChatResponse = await sendChatMessage(req);

      // Replace loading message with response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: response.reply,
                isLoading: false,
                timestamp: new Date(response.timestamp),
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: `Désolé, une erreur est survenue: ${err.message}. Veuillez réessayer.`,
                isLoading: false,
              }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Format markdown-like content (bold, line breaks)
  function formatContent(content: string) {
    return content
      .split('\n')
      .map((line, i) => {
        // Bold **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-semibold">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
            {i < content.split('\n').length - 1 && <br />}
          </span>
        );
      });
  }

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">Assistant IA</span>
          <Sparkles className="h-4 w-4 opacity-75" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Assistant BVMT</h3>
                <p className="text-xs text-blue-100">Propulsé par IA</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Analyse en cours...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{formatContent(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (only show when few messages) */}
          {messages.length <= 2 && !isTyping && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white">
              <p className="text-xs text-slate-500 mb-2">Questions suggérées :</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
