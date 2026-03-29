import {useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Bot, MessageCircleMore, Sparkles, Trash2, X} from 'lucide-react';

import ChatInput from './ChatInput.jsx';
import ChatMessage from './ChatMessage.jsx';

const QUICK_ACTIONS = [
  {label: 'Apply Certificate', query: 'How to apply for income certificate?'},
  {label: 'File Complaint', query: 'How to file complaint?'},
  {label: 'Check Documents', query: 'What documents are required?'},
];

function buildMockReply(question) {
  const normalized = question.toLowerCase();

  if (normalized.includes('income certificate')) {
    return [
      'To apply for an income certificate:',
      '1. Visit your state e-district portal or nearest Tehsildar office.',
      '2. Fill the income certificate form and upload details.',
      '3. Submit identity + address + income proof documents.',
      '4. Track status online using your application number.',
      '',
      'Common documents:',
      '- Aadhaar card',
      '- Address proof',
      '- Salary slip / income affidavit',
      '- Passport-size photo',
    ].join('\n');
  }

  if (normalized.includes('complaint')) {
    return [
      'For filing a civic complaint:',
      '1. Open the complaint section in JAN-VAANI.',
      '2. Add issue details (location, date, department, evidence).',
      '3. Attach photos/documents if available.',
      '4. Submit and save the complaint reference number.',
      '',
      'Tip: Mention exact ward/area and affected timeline for faster action.',
    ].join('\n');
  }

  if (normalized.includes('document') || normalized.includes('docs')) {
    return [
      'Typical required documents (depends on service):',
      '- Identity proof (Aadhaar / PAN / Voter ID)',
      '- Address proof (ration card / utility bill)',
      '- Passport-size photograph',
      '- Application form',
      '- Service-specific proof (income, residence, birth, etc.)',
      '',
      'Tell me the exact certificate/service and I will give a precise list.',
    ].join('\n');
  }

  return 'I can help with certificates, complaints, and government document checklists. Try one of the quick actions below.';
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
      text: 'Namaste. I am JAN-VAANI Assistant. Ask me about certificates, complaints, and required documents.',
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

  const sendMessage = () => {
    const query = inputValue.trim();
    if (!query || isTyping) {
      return;
    }

    const userMessage = {id: `u-${Date.now()}`, role: 'user', text: query};
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    window.setTimeout(() => {
      const replyText = buildMockReply(query);
      setMessages((prev) => [...prev, {id: `b-${Date.now()}`, role: 'bot', text: replyText}]);
      setIsTyping(false);

      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    }, 900);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'bot',
        text: 'Chat cleared. Ask me anything about civic services.',
      },
    ]);
    setUnreadCount(0);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[80]">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-[0_16px_30px_rgba(37,99,235,0.35)] transition hover:scale-105"
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircleMore className="h-6 w-6" />}
          {!isOpen && unreadCount > 0 ? <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#ff4a4a]" /> : null}
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
            <div className="flex h-full flex-col border border-slate-200 bg-[linear-gradient(150deg,rgba(248,250,252,0.95),rgba(239,246,255,0.92))] backdrop-blur-xl md:rounded-3xl md:shadow-[0_30px_80px_rgba(37,99,235,0.2)]">
              <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sky-700">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">JAN-VAANI Assistant</p>
                    <p className="flex items-center gap-1 text-xs text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-[#44d13d]" />
                      Online
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-sky-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Chat
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {isTyping ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-ink-600">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    AI is typing...
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
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
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
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
