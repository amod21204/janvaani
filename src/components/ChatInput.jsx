import {Mic, SendHorizontal} from 'lucide-react';

export default function ChatInput({value, onChange, onSend, disabled = false}) {
  const handleSubmit = () => {
    if (!value.trim() || disabled) {
      return;
    }
    onSend();
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask about forms, complaints, documents..."
          className="h-11 flex-1 rounded-xl border border-transparent bg-white/70 px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#7f8894] focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/20"
        />

        <button
          type="button"
          aria-label="Voice input"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/50 bg-white/70 text-[#4f5d6c] transition hover:bg-white"
        >
          <Mic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

