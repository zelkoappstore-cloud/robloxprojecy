'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

type Msg = { id: string; senderId: string; content: string };

export default function ChatBox({ meId, peerId }: { meId: string; peerId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = () => fetch('/api/messages/history?with=' + peerId).then(r => r.json()).then(d => { if (d.messages) setMsgs(d.messages); });
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [peerId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const r = await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: peerId, content: text }) });
    if (r.ok) { const m = await r.json(); setMsgs(p => [...p, m]); setText(''); }
    setSending(false);
  }

  return (
    <div className='flex h-96 w-full max-w-md flex-col rounded-2xl border border-white/10 bg-slate-900'>
      <div className='flex-1 space-y-2 overflow-y-auto p-4'>
        {msgs.map(m => (
          <div key={m.id} className={'anim-slide flex ' + (m.senderId === meId ? 'justify-end' : 'justify-start')}>
            <span className={'max-w-[75%] rounded-2xl px-3 py-2 text-sm ' + (m.senderId === meId ? 'bg-indigo-600' : 'bg-slate-800')}>{m.content}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className='flex gap-2 border-t border-white/10 p-3'>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} maxLength={2000}
          className='flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500' placeholder='Votre message' />
        <button onClick={send} disabled={sending} className='rounded-xl bg-indigo-600 p-2.5 transition hover:bg-indigo-500 active:scale-90 disabled:opacity-60'>
          {sending ? <Loader2 size={18} className='animate-spin' /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
