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

export interface ChatSuggestion {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  reason: string;
  timestamp: Date;
  source: 'chat';
}

interface ChatBotProps {
  investorName?: string;
  investorProfile?: string;
  investmentAmount?: number;
  /** Pre-fill with a stock ticker to focus analysis */
  focusStock?: string;
  /** Callback when chat yields actionable suggestions */
  onSuggestion?: (suggestions: ChatSuggestion[]) => void;
  /** Change this key to reset the chat (e.g. on profile change) */
  resetKey?: string | number;
}

const SUGGESTED_QUESTIONS = [
  'Quel est le meilleur investissement pour un débutant ?',
  'Analyse le marché BVMT aujourd\'hui',
  'Quels sont les risques à surveiller ?',
  'Comment diversifier mon portefeuille ?',
];

function buildWelcomeMessage(name: string, profile: string, amount: number): Message {
  const profileTips: Record<string, string> = {
    'Conservateur': 'Je vais prioriser les valeurs stables et limiter le risque. 🛡️',
    'Modéré': 'Je vais chercher un bon équilibre rendement/risque pour vous. ⚖️',
    'Agressif': 'Je vais cibler les opportunités à fort potentiel de croissance. 🚀',
  };
  const tip = profileTips[profile] || '';
  return {
    id: 'welcome',
    role: 'assistant',
    content: `Bonjour ${name} ! 👋 Je suis votre assistant d'investissement BVMT.\n\n📊 **Profil** : ${profile}\n💰 **Capital** : ${amount.toLocaleString()} TND\n\n${tip}\n\nPosez-moi vos questions sur le marché tunisien, vos positions ou une action spécifique.`,
    timestamp: new Date(),
  };
}

export default function ChatBot({
  investorName = 'Ahmed',
  investorProfile = 'Modere',
  investmentAmount = 5000,
  focusStock,
  onSuggestion,
  resetKey,
}: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    buildWelcomeMessage(investorName, investorProfile, investmentAmount),
  ]);

  // Reset chat when resetKey changes (profile change)
  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey !== undefined && resetKey !== prevResetKey.current) {
      prevResetKey.current = resetKey;
      setMessages([buildWelcomeMessage(investorName, investorProfile, investmentAmount)]);
      setInput('');
      setIsTyping(false);
      setIsOpen(true); // auto-open so user sees the new context
    }
  }, [resetKey, investorName, investorProfile, investmentAmount]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFocusStock = useRef(focusStock);

  // Auto-open and ask about focusStock when it changes
  useEffect(() => {
    if (focusStock && focusStock !== prevFocusStock.current) {
      prevFocusStock.current = focusStock;
      setIsOpen(true);

      // Parse focusStock format: "explain-buy-SYMBOL-timestamp" or "SYMBOL-timestamp"
      const explainMatch = focusStock.match(/^explain-(buy|sell)-(\w+)-/);
      const stockMatch = focusStock.match(/^(\w+)-\d+$/);

      let question: string;
      if (explainMatch) {
        const [, action, symbol] = explainMatch;
        const actionFr = action === 'buy' ? 'acheter' : 'vendre';
        question = `Je suis débutant et je veux ${actionFr} ${symbol}. Explique-moi brièvement : c'est quoi cette action, les risques, et si c'est un bon moment pour ${actionFr} ? Donne une réponse simple et courte avec mon capital de ${investmentAmount} TND.`;
      } else if (stockMatch) {
        question = `Analyse détaillée de ${stockMatch[1]} : prévisions, sentiment et recommandation. Pourquoi investir ou non ?`;
      } else {
        question = `Analyse détaillée de ${focusStock} : prévisions, sentiment et recommandation.`;
      }

      setTimeout(() => {
        handleSend(question);
      }, 300);
    }
  }, [focusStock]);

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

      // Extract stock suggestions from bot reply
      if (onSuggestion) {
        const extracted = extractSuggestions(response.reply);
        if (extracted.length > 0) onSuggestion(extracted);
      }

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

  /** Parse bot reply for stock symbols + buy/sell/hold keywords */
  function extractSuggestions(reply: string): ChatSuggestion[] {
    const KNOWN_SYMBOLS = [
      'BIAT','BNA','SFBT','PGH','STB','ATTIJARI','TLNET','SAH',
      'SOTUVER','TUNTEL','ENNAKL','MONOPRIX','SOTIPAPIER','DH',
    ];
    const suggestions: ChatSuggestion[] = [];
    const upper = reply.toUpperCase();
    for (const sym of KNOWN_SYMBOLS) {
      if (!upper.includes(sym)) continue;
      // Determine action by proximity keywords
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      const buyWords = ['acheter','achat','investir','opportunité','hausse','haussière','recommander','positif','intéressant'];
      const sellWords = ['vendre','vente','alléger','baisse','baissière','négatif','éviter','risque élevé'];
      const lowerReply = reply.toLowerCase();
      // Find the sentence containing the symbol
      const sentences = lowerReply.split(/[.!?\n]+/);
      const relevantSentences = sentences.filter(s => s.toUpperCase().includes(sym));
      const context = relevantSentences.join(' ');
      if (buyWords.some(w => context.includes(w))) action = 'buy';
      else if (sellWords.some(w => context.includes(w))) action = 'sell';
      // Extract a reason (first relevant sentence, trimmed)
      const reason = relevantSentences[0]?.trim().slice(0, 120) || `Mentionné dans l'analyse`;
      suggestions.push({
        id: `sug-${sym}-${Date.now()}`,
        symbol: sym,
        action,
        reason: reason.charAt(0).toUpperCase() + reason.slice(1),
        timestamp: new Date(),
        source: 'chat',
      });
    }
    return suggestions;
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-soft-md hover:shadow-soft-lg hover:scale-105 transition-all duration-200"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-content)' }}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">Assistant IA</span>
          <Sparkles className="h-4 w-4 opacity-75" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] rounded-2xl shadow-soft-lg flex flex-col overflow-hidden animate-scale-in"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-content)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Assistant BVMT</h3>
                <p className="text-xs opacity-75">Propulsé par IA</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'inherit' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ backgroundColor: 'var(--surface-secondary)' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent)',
                  }}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-content)', borderBottomRightRadius: '0.375rem' }
                      : { backgroundColor: 'var(--surface)', color: 'var(--content)', border: '1px solid var(--border)', borderBottomLeftRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }
                  }
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2" style={{ color: 'var(--content-tertiary)' }}>
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
            <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--content-tertiary)' }}>Questions suggérées :</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs px-3 py-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--content-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-tertiary)'; e.currentTarget.style.color = 'var(--content-secondary)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                disabled={isTyping}
                className="input flex-1 rounded-xl"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-content)' }}
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
