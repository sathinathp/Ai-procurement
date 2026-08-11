import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Clipboard, HelpCircle, Trash2, ArrowRight } from 'lucide-react';
import { copilotService } from '../services/api';

export default function CopilotChat({ inlineMode = false, rfqContextNumber = null }) {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('copilot_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse stored copilot messages:", e);
      }
    }
    return [
      {
        role: 'assistant',
        content: "Hello! I am your **Procurement AI Copilot** connected directly to the database tables (Suppliers, RFQs, Quote Responses, Purchase Orders). \n\nAsk me queries about last purchase prices, supplier scorecard ratings, quote comparisons, or delayed deliveries."
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('copilot_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'copilot_messages' && e.newValue) {
        try {
          setMessages(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleFocus = () => {
      const saved = localStorage.getItem('copilot_messages');
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Quick Chips
  const promptChips = [
    { label: "PVC Resin last price?", text: "What is the last purchase price of PVC Resin?" },
    { label: "Who supplied HDPE last?", text: "Who supplied HDPE Granules last?" },
    { label: "Which suppliers delayed deliveries?", text: "Which suppliers have delayed deliveries recently?" },
    { label: "How many pending RFQs?", text: "How many pending RFQs do we have?" },
    { label: "Suppliers from Germany", text: "Show suppliers from Germany." },
    { label: "What is the last PO?", text: "What was the last purchase order?" }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    // Add user message
    const updatedMessages = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    // Call service
    copilotService.chat(updatedMessages, rfqContextNumber)
      .then((res) => {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an issue querying the database system." }]);
        setLoading(false);
      });
  };

  const handleClearChat = () => {
    const cleared = [
      {
        role: 'assistant',
        content: "Chat history cleared. I am ready for your next procurement query."
      }
    ];
    setMessages(cleared);
    localStorage.setItem('copilot_messages', JSON.stringify(cleared));
  };

  // Helper to parse inline markdown formatting (bold, code, italics)
  const inlineFormatting = (text) => {
    if (!text) return '';
    let formatted = text;
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    // Italics: *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-slate-850">$1</em>');
    // Inline code: `code`
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-slate-100 text-[#0078d4] font-semibold font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-slate-200/50">$1</code>');
    return formatted;
  };

  // Advanced Markdown-to-HTML parser that supports markdown tables, lists, code blocks and paragraphs
  const formatMessageText = (text) => {
    if (!text) return '';

    const lines = text.split('\n');
    const result = [];
    let currentTable = null; // { headers: [], rows: [] }
    let currentList = null;  // { type: 'ul' | 'ol', items: [] }
    let inCodeBlock = false;
    let codeContent = [];

    const flushTable = () => {
      if (currentTable) {
        const headerHtml = `<thead class="bg-slate-50/80 border-b border-slate-200">
          <tr>
            ${currentTable.headers.map(h => `<th class="px-3.5 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">${h}</th>`).join('')}
          </tr>
        </thead>`;

        const rowsHtml = `<tbody class="divide-y divide-slate-100 bg-white">
          ${currentTable.rows.map((row, rIdx) => `
            <tr class="hover:bg-slate-50/60 transition-colors ${rIdx % 2 === 1 ? 'bg-slate-50/20' : ''}">
              ${row.map(cell => {
                // Align numeric values right, dates and normal text left
                const isNumeric = /^[$\d,.-]+%?$/.test(cell.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(cell.trim());
                const alignClass = isNumeric ? 'text-right' : 'text-left';
                return `<td class="px-3.5 py-2.5 text-xs text-slate-600 font-medium ${alignClass}">${cell}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>`;

        result.push(`
          <div class="my-3 overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 table-auto">
                ${headerHtml}
                ${rowsHtml}
              </table>
            </div>
          </div>
        `);
        currentTable = null;
      }
    };

    const flushList = () => {
      if (currentList) {
        const listClass = currentList.type === 'ul' ? 'list-disc pl-5' : 'list-decimal pl-5';
        const itemsHtml = currentList.items.map(item => `<li class="mb-1 text-slate-700">${item}</li>`).join('');
        result.push(`<${currentList.type} class="${listClass} my-2 space-y-1">${itemsHtml}</${currentList.type}>`);
        currentList = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Code block check
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          result.push(`<pre class="bg-slate-900 text-slate-100 rounded-xl p-3 my-2.5 font-mono text-[11px] overflow-x-auto shadow-inner"><code>${codeContent.join('\n')}</code></pre>`);
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Table line check
      const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');
      if (isTableLine) {
        flushList();
        
        const cells = line.split('|')
          .map(c => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        const isSeparator = cells.every(c => c.match(/^:?-+:?$/));
        if (isSeparator) {
          continue;
        }

        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
        continue;
      } else {
        flushTable();
      }

      // Unordered list item check
      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        const itemText = inlineFormatting(ulMatch[1]);
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [itemText] };
        } else {
          currentList.items.push(itemText);
        }
        continue;
      }

      // Ordered list item check
      const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (olMatch) {
        const itemText = inlineFormatting(olMatch[1]);
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [itemText] };
        } else {
          currentList.items.push(itemText);
        }
        continue;
      }

      // Flush lists if any normal line encountered
      flushList();

      if (line.trim() === '') {
        result.push('<div class="h-2"></div>');
      } else {
        result.push(`<p class="text-slate-700 leading-relaxed">${inlineFormatting(line)}</p>`);
      }
    }

    flushTable();
    flushList();

    return result.join('\n');
  };

  return (
    <div className={`flex flex-col bg-white border border-slate-200 shadow-xl ${
      inlineMode ? 'h-full w-full' : 'fixed right-0 top-14 bottom-0 w-[440px] z-40'
    } transition-all duration-300`}>
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 backdrop-blur flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-[#0078d4] text-white rounded-lg shadow-sm">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1">
              Procurement AI Copilot
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected to Seeded DB
            </span>
          </div>
        </div>
        <button 
          onClick={handleClearChat}
          className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-205 rounded-lg transition-colors"
          title="Clear Chat Logs"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/20">
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3.5 max-w-[92%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow border ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white border-slate-600' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-indigo-200'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Bubble */}
            <div className={`p-4 rounded-2xl text-[13px] leading-relaxed font-medium ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-blue-600 to-[#0078d4] text-white rounded-tr-none shadow-md shadow-blue-100/40 py-3' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-md shadow-slate-100/30 w-full min-w-0'
            }`}>
              <div 
                dangerouslySetInnerHTML={{ __html: formatMessageText(msg.content) }} 
                className="space-y-1.5"
              />
            </div>
          </div>
        ))}

        {/* AI is thinking shimmer */}
        {loading && (
          <div className="flex gap-3 max-w-[90%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow border border-indigo-200">
              <Bot size={14} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="ai-thinking-shimmer h-9 rounded-2xl border border-slate-200 p-3 flex items-center shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold">Copilot is querying database & drafting response...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="p-4 bg-white border-t border-slate-150 shrink-0">
        <span className="text-[10px] text-slate-400 font-bold block mb-2 flex items-center gap-1 uppercase tracking-wider">
          <HelpCircle size={12} className="text-[#0078d4]" /> Suggestion Chips
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
          {promptChips.map((chip, idx) => (
            <button 
              key={idx}
              onClick={() => handleSend(chip.text)}
              disabled={loading}
              className="text-[10.5px] bg-slate-50 hover:bg-blue-50 text-[#0078d4] font-semibold border border-slate-200 hover:border-[#0078d4]/30 px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center gap-1"
            >
              <span>{chip.label}</span>
              <ArrowRight size={8} />
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2.5 items-center z-10 shrink-0"
      >
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot (e.g. PVC Resin last price?)"
          className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] bg-white font-medium shadow-inner transition-all"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-[#0078d4] hover:bg-[#106ebe] text-white p-2.5 rounded-xl transition-all duration-200 shrink-0 disabled:opacity-40 disabled:hover:bg-[#0078d4] shadow hover:shadow-md active:scale-95 flex items-center justify-center h-[36px] w-[36px]"
        >
          <Send size={14} />
        </button>
      </form>

    </div>
  );
}
