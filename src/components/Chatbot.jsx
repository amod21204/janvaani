import {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Bot, MessageCircleMore, Sparkles, Trash2, X} from 'lucide-react';

import {CHATBOT_SERVICES, FALLBACK_CATEGORIES, FALLBACK_SUGGESTIONS} from '../services/chatbotServices.js';
import ChatInput from './ChatInput.jsx';
import ChatMessage from './ChatMessage.jsx';

const QUICK_ACTIONS = [
  {label: 'Apply Certificate', query: 'How to apply for income certificate?'},
  {label: 'File Complaint', query: 'How to file complaint?'},
  {label: 'Check Documents', query: 'What documents are required for domicile certificate?'},
];

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

function scoreServiceMatch(query, service) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = new Set(tokenize(query));

  let score = 0;
  const phrases = [service.label, ...(service.aliases ?? []), ...(service.keywords ?? [])];

  for (const phrase of phrases) {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) {
      continue;
    }

    if (normalizedQuery.includes(normalizedPhrase)) {
      score += normalizedPhrase.includes(' ') ? 7 : 3;
    }

    for (const token of tokenize(phrase)) {
      if (queryTokens.has(token)) {
        score += 1;
      }
    }
  }

  if (normalizedQuery.includes(service.category)) {
    score += 2;
  }

  return score;
}

function findBestService(query) {
  const services = Object.values(CHATBOT_SERVICES);

  const ranked = services
    .map((service) => ({service, score: scoreServiceMatch(query, service)}))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 3) {
    return null;
  }

  return best.service;
}

function formatServiceResponse(service) {
  return [
    `${service.label} Guidance:`,
    `Category: ${service.category}`,
    `Office: ${service.office}`,
    `Expected Time: ${service.time}`,
    '',
    'Required Documents:',
    ...service.documents.map((item) => `- ${item}`),
    '',
    'Steps to Apply:',
    ...service.steps.map((step, index) => `${index + 1}. ${step}`),
  ].join('\n');
}

function buildBotReply(query) {
  const matchedService = findBestService(query);

  if (matchedService) {
    return {
      text: formatServiceResponse(matchedService),
      suggestions: Object.values(CHATBOT_SERVICES)
        .filter((entry) => entry.category === matchedService.category && entry.id !== matchedService.id)
        .slice(0, 3)
        .map((entry) => entry.label),
      matchedService,
    };
  }

  return {
    text: `Sorry, I don't have exact info yet, but I can guide you. Please select a category: ${FALLBACK_CATEGORIES.join(', ')}`,
    suggestions: FALLBACK_SUGGESTIONS,
    matchedService: null,
  };
}

export default function Chatbot({onStartComplaint}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Namaste. I am JAN-VAANI Assistant. Ask me about certificates, complaints, IDs, and document checklists.',
      suggestions: FALLBACK_SUGGESTIONS,
    },
  ]);
  const scrollRef = useRef(null);

  const quickActions = useMemo(() => QUICK_ACTIONS, []);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  const submitQuery = (query) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || isTyping) {
      return;
    }

    const userMessage = {id: `u-${Date.now()}`, role: 'user', text: normalizedQuery};
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    window.setTimeout(() => {
      const reply = buildBotReply(normalizedQuery);
      setMessages((prev) => [
        ...prev,
        {id: `b-${Date.now()}`, role: 'bot', text: reply.text, suggestions: reply.suggestions},
      ]);
      setIsTyping(false);

      if (reply.matchedService?.category === 'complaints') {
        onStartComplaint?.();
      }

      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    }, 900);
  };

  const sendMessage = () => {
    submitQuery(inputValue);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'bot',
        text: 'Chat cleared. Ask me about any government service and I will guide you step by step.',
        suggestions: FALLBACK_SUGGESTIONS,
      },
    ]);
    setUnreadCount(0);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[80] app-slide-up">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="btn-glass group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white shadow-[0_16px_30px_rgba(0,95,198,0.38)] transition hover:scale-105"
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircleMore className="h-6 w-6" />}
          {!isOpen && unreadCount > 0 ? <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#ef4444]" /> : null}
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.section
            initial={{opacity: 0, y: 24, scale: 0.98}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 24, scale: 0.98}}
            transition={{duration: 0.25}}
            className="fixed inset-0 z-[79] md:inset-auto md:bottom-24 md:right-5 md:h-[640px] md:w-[420px]"
          >
            <div className="glass-panel flex h-full flex-col border border-white/35 bg-[linear-gradient(150deg,rgba(240,247,255,0.75),rgba(239,246,255,0.86))] backdrop-blur-xl md:rounded-3xl md:shadow-[0_30px_80px_rgba(32,54,86,0.24)]">
              <header className="flex items-center justify-between border-b border-white/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[#1264a3]">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">JAN-VAANI Assistant</p>
                    <p className="flex items-center gap-1 text-xs text-[#2563EB]">
                      <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                      Online
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/50 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Chat
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} onSuggestionClick={submitQuery} />
                ))}

                {isTyping ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    AI is typing...
                  </div>
                ) : null}
              </div>

              <div className="border-t border-white/40 px-3 py-3 sm:px-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        setInputValue(action.query);
                        if (action.label === 'File Complaint') {
                          onStartComplaint?.();
                        }
                      }}
                      className="rounded-full border border-white/50 bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#1E40AF] transition hover:bg-white"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                <ChatInput value={inputValue} onChange={setInputValue} onSend={sendMessage} disabled={isTyping} />
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}


