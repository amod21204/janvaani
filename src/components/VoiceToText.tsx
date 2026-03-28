import {useEffect, useRef, useState} from 'react';
import {Mic, MicOff, Languages, AlertCircle} from 'lucide-react';

type SupportedLanguage = 'en-US' | 'hi-IN' | 'mr-IN';

interface VoiceToTextProps {
  initialLanguage?: SupportedLanguage;
  label?: string;
  placeholder?: string;
  onTranscriptChange?: (value: string) => void;
  value?: string;
  compact?: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

const LANGUAGE_OPTIONS: Array<{label: string; value: SupportedLanguage}> = [
  {label: 'English', value: 'en-US'},
  {label: 'Hindi', value: 'hi-IN'},
  {label: 'Marathi', value: 'mr-IN'},
];

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
}

function getFriendlyErrorMessage(error: string) {
  switch (error) {
    case 'no-speech':
      return 'No speech was detected. Please try speaking again.';
    case 'audio-capture':
      return 'No microphone was found. Please connect or enable a microphone.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Please allow microphone permission in your browser settings.';
    case 'network':
      return 'A network issue interrupted speech recognition. Please try again.';
    case 'aborted':
      return 'Recording was stopped before transcription completed.';
    default:
      return 'Speech recognition failed. Please try again.';
  }
}

export default function VoiceToText({
  initialLanguage = 'en-US',
  label = 'Voice to Text',
  placeholder = 'Your speech will appear here in real-time...',
  onTranscriptChange,
  value,
  compact = false,
}: VoiceToTextProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof value === 'string') {
      setTranscript(value);
    }
  }, [value]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let nextTranscript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        nextTranscript += event.results[index][0].transcript;
      }

      setTranscript(nextTranscript.trim());
      onTranscriptChange?.(nextTranscript.trim());
    };

    recognition.onerror = (event) => {
      setError(getFriendlyErrorMessage(event.error));
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscriptChange, selectedLanguage]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    setError(null);
    recognitionRef.current.lang = selectedLanguage;
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div
      className={
        compact
          ? 'w-full rounded-2xl border border-[#eadfce] bg-[#faf6f1] p-3'
          : 'w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          {!compact && <h2 className="mt-1 text-xl font-bold text-slate-900">Live Speech Recognition</h2>}
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          <Languages className="h-4 w-4" />
          <select
            value={selectedLanguage}
            onChange={(event) => setSelectedLanguage(event.target.value as SupportedLanguage)}
            className="bg-transparent outline-none"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isSupported && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          This browser does not support the Web Speech API.
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!compact && (
        <textarea
          value={transcript}
          onChange={(event) => {
            setTranscript(event.target.value);
            onTranscriptChange?.(event.target.value);
          }}
          placeholder={placeholder}
          className="mt-4 min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
        />
      )}

      <div className={compact ? 'mt-3 flex flex-col gap-3' : 'mt-4 flex flex-col gap-3 sm:flex-row'}>
        <button
          onClick={startRecording}
          disabled={!isSupported || isRecording}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mic className="h-4 w-4" />
          Start Recording
        </button>

        <button
          onClick={stopRecording}
          disabled={!isSupported || !isRecording}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MicOff className="h-4 w-4" />
          Stop Recording
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Status: {isRecording ? 'Listening...' : 'Idle'}
        {compact && transcript ? ` • ${transcript.length} characters captured` : ''}
      </p>
    </div>
  );
}
