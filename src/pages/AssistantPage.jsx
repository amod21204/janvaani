import { AudioLines, Bot, Mic, Volume2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
import Input from '../components/shared/Input';
import Section from '../components/shared/Section';

function getRecognitionCtor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function buildAssistantReply(query) {
  const text = query.toLowerCase();

  if (text.includes('income certificate')) {
    return [
      'You can apply via your state e-district portal or Tehsildar office.',
      'Keep Aadhaar, address proof, and income proof ready before submission.',
      'I recommend opening Services to start a guided application flow.',
    ];
  }

  if (text.includes('complaint') || text.includes('police')) {
    return [
      'For a complaint, include location, date, issue details, and supporting evidence.',
      'You can submit from the Complaints page and track status updates there.',
      'If urgent, call helpline first and then file the written complaint.',
    ];
  }

  if (text.includes('document') || text.includes('certificate') || text.includes('passport')) {
    return [
      'Document requirements vary by service and state.',
      'Commonly required: identity proof, address proof, photograph, and service-specific proof.',
      'Open Documents or Services for a checklist tailored to your request.',
    ];
  }

  return [
    'I understood your request and can help you proceed step by step.',
    'Please open Services for guided application help or Complaints for issue reporting.',
    'If you tell me the exact service name, I can give a precise checklist.',
  ];
}

export default function AssistantPage() {
  const [recognizedText, setRecognizedText] = useState('Say your request and I will convert it to text here.');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Ready');
  const recognitionRef = useRef(null);

  const transcript = useMemo(() => {
    const responses = buildAssistantReply(recognizedText);
    return [
      { role: 'user', text: recognizedText },
      { role: 'assistant', text: responses[0] },
      { role: 'assistant', text: responses[1] },
      { role: 'assistant', text: responses[2] },
    ];
  }, [recognizedText]);

  const startVoiceSession = async () => {
    setVoiceError('');
    setVoiceStatus('Requesting microphone access...');

    const RecognitionCtor = getRecognitionCtor();
    if (!RecognitionCtor) {
      setVoiceError('Voice input is not supported in this browser. Use latest Chrome or Edge.');
      setVoiceStatus('Unsupported browser');
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore if not started.
        }
      }

      const recognition = new RecognitionCtor();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening... Speak now');
      };

      recognition.onresult = (event) => {
        let combined = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          combined += `${event.results[i][0].transcript} `;
        }

        const cleaned = combined.trim();
        if (cleaned) {
          setRecognizedText(cleaned);
          setVoiceStatus('Voice captured successfully');
        }
      };

      recognition.onerror = (event) => {
        const code = event?.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setVoiceError('Microphone permission denied. Please allow mic in browser settings.');
        } else if (code === 'no-speech') {
          setVoiceError('No speech detected. Try again and speak clearly.');
        } else {
          setVoiceError('Voice recognition failed. Please retry.');
        }
        setVoiceStatus('Voice capture failed');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceStatus((prev) => (prev === 'Listening... Speak now' ? 'Stopped' : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceError('Could not access microphone. Check browser/site microphone permissions.');
      setVoiceStatus('Permission blocked');
      setIsListening(false);
    }
  };

  const stopVoiceSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // No-op.
      }
    }
    setIsListening(false);
    setVoiceStatus('Stopped');
  };

  return (
    <div className="space-y-6 pb-4">
      <Section
        eyebrow="Voice Copilot"
        title="Voice Assistant"
        subtitle="Speak naturally and get live transcription plus dynamic civic guidance."
      >
        <Card className="overflow-hidden bg-white p-0 text-ink-900">
          <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-sky-600 text-white sm:h-28 sm:w-28">
                <Mic size={32} />
              </div>
              <p className="mt-6 font-display text-xl font-bold text-ink-950">Voice Input</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-ink-700">
                Click Start Voice, allow microphone permission, then speak your request.
              </p>

              <div className="mt-5 flex w-full max-w-xs gap-2">
                <Button
                  className="flex-1"
                  onClick={startVoiceSession}
                  loading={isListening}
                >
                  <AudioLines size={18} />
                  {isListening ? 'Listening...' : 'Start Voice'}
                </Button>
                <Button variant="secondary" onClick={stopVoiceSession} disabled={!isListening}>
                  Stop
                </Button>
              </div>

              <p className="mt-3 text-xs font-semibold text-sky-700">Status: {voiceStatus}</p>
              {voiceError ? <p className="mt-2 text-xs text-red-600">{voiceError}</p> : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <Volume2 size={16} />
                  Heard from user
                </div>
                <Input
                  value={recognizedText}
                  onChange={(event) => setRecognizedText(event.target.value)}
                  className="text-base"
                />
                <p className="mt-2 text-xs text-ink-600">You can also type manually if mic is blocked.</p>
              </div>

              <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4">
                {transcript.map((entry, index) => (
                  <div
                    key={`${entry.role}-${index}`}
                    className={`rounded-[18px] p-4 ${entry.role === 'user' ? 'bg-sky-50' : 'bg-slate-50'}`}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-700">
                      {entry.role === 'user' ? <Mic size={14} /> : <Bot size={14} />}
                      {entry.role}
                    </div>
                    <p className="text-sm leading-6 text-ink-900">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </Section>
    </div>
  );
}
