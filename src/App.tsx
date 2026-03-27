/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Download, 
  FileText, 
  MessageSquare, 
  AlertCircle, 
  Loader2, 
  Trash2,
  Scale,
  Languages,
  Info,
  Copy,
  Check
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import { generateLegalDocument } from "./services/gemini.ts";
import { cn } from "./lib/utils.ts";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  document?: {
    type: string;
    title: string;
    content: string;
    language: string;
    explanation: string;
  };
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      text: "Namaste! I am JAN-VAANI, your AI Civic Legal Copilot. Describe your problem in simple language (Hindi, English, or any other), and I will help you draft RTI applications, complaint letters, or legal notices.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateLegalDocument(input);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: result.explanation,
        document: result,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadPDF = (doc: any) => {
    // Check if content contains non-ASCII characters (like Hindi)
    const isNonEnglish = /[^\x00-\x7F]/.test(doc.content);
    
    if (isNonEnglish) {
      // Fallback to text file for non-English content as standard jsPDF doesn't support UTF-8 easily
      const element = document.createElement("a");
      const file = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `${doc.type}_${doc.title.replace(/\s+/g, "_")}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text(doc.title, 20, 20);
    pdf.setFontSize(12);
    
    const splitText = pdf.splitTextToSize(doc.content.replace(/#/g, ""), 170);
    pdf.text(splitText, 20, 40);
    
    pdf.save(`${doc.type}_${doc.title.replace(/\s+/g, "_")}.pdf`);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "ai",
        text: "Namaste! I am JAN-VAANI, your AI Civic Legal Copilot. Describe your problem in simple language (Hindi, English, or any other), and I will help you draft RTI applications, complaint letters, or legal notices.",
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-[#333]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Scale className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">JAN-VAANI</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">AI Civic Legal Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            <Languages className="w-3.5 h-3.5" />
            <span>Multilingual Support</span>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-8 space-y-6 scroll-smooth"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col max-w-[85%] sm:max-w-[75%]",
                  msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm",
                  msg.role === "user" 
                    ? "bg-orange-600 text-white rounded-tr-none" 
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                )}>
                  <p className="text-sm sm:text-base leading-relaxed">{msg.text}</p>
                </div>

                {msg.document && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md"
                  >
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{msg.document.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => copyToClipboard(msg.document?.content || "", msg.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <><Check className="w-3.5 h-3.5 text-green-500" /> COPIED</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> COPY TEXT</>
                          )}
                        </button>
                        <button 
                          onClick={() => downloadPDF(msg.document)}
                          className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {/[^\x00-\x7F]/.test(msg.document.content) ? "DOWNLOAD TXT" : "DOWNLOAD PDF"}
                        </button>
                      </div>
                    </div>
                    <div className="p-6 bg-white overflow-x-auto">
                      <div className="markdown-body prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.document.content}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-gray-400 italic text-sm"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              JAN-VAANI is drafting your document...
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="py-6 bg-[#F8F9FA]">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe your problem (e.g., 'I want to file an RTI for road repair status in my area')..."
              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none shadow-sm min-h-[60px] max-h-[200px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:hover:bg-orange-600 transition-all shadow-lg shadow-orange-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            <span className="flex items-center gap-1"><Info className="w-3 h-3" /> AI Generated Drafts</span>
            <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> Verify before use</span>
          </div>
        </div>
      </main>

      {/* Footer / Info */}
      <footer className="bg-white border-t border-gray-100 py-3 px-6 text-center">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
          Empowering Citizens through AI & Legal Literacy
        </p>
      </footer>
    </div>
  );
}
