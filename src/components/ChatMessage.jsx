import {Bot, UserRound} from 'lucide-react';

function renderTextBlocks(text) {
  return text.split('\n').map((line, index) => {
    if (!line.trim()) {
      return <div key={`space-${index}`} className="h-2" />;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      return (
        <p key={`line-${index}`} className="pl-1 text-[13px] font-medium leading-relaxed text-inherit">
          {line}
        </p>
      );
    }

    if (/^-\s/.test(line.trim())) {
      return (
        <p key={`line-${index}`} className="pl-1 text-[13px] leading-relaxed text-inherit">
          {line}
        </p>
      );
    }

    if (line.trim().endsWith(':')) {
      return (
        <p key={`line-${index}`} className="text-[13px] font-semibold leading-relaxed text-inherit">
          {line}
        </p>
      );
    }

    return (
      <p key={`line-${index}`} className="text-[13px] leading-relaxed text-inherit">
        {line}
      </p>
    );
  });
}

export default function ChatMessage({message, onSuggestionClick}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#0d4f7a] shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <div className="max-w-[85%]">
        <div
          className={[
            'rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
            isUser
              ? 'rounded-br-md bg-gradient-to-br from-[#ff6a00] to-[#d84b00] text-white'
              : 'rounded-bl-md border border-white/40 bg-white/75 text-[#1f2630]',
          ].join(' ')}
        >
          {renderTextBlocks(message.text)}
        </div>

        {!isUser && Array.isArray(message.suggestions) && message.suggestions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionClick?.(suggestion)}
                className="rounded-full border border-white/50 bg-white/80 px-3 py-1 text-xs font-semibold text-[#2f4f6a] transition hover:bg-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#7a3d1a] shadow-sm">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}
