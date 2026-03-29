import {Mic, SendHorizontal} from 'lucide-react';

export default function ChatInput({value, onChange, onSend, disabled = false}) {
  const handleSubmit = () => {
    if (!value.trim() || disabled) {
      return;
    }
    onSend();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
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
          className="h-11 flex-1 rounded-xl border border-transparent bg-white px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-600 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-100"
        />

        <button
          type="button"
          aria-label="Voice input"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-700 transition hover:bg-sky-50"
        >
          <Mic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
