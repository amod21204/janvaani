import {Bot, UserRound} from 'lucide-react';

export default function ChatMessage({message}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <div
        className={[
          'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-sky-500 to-sky-700 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-ink-900',
        ].join(' ')}
      >
        <p className="whitespace-pre-line">{message.text}</p>
      </div>

      {isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}
