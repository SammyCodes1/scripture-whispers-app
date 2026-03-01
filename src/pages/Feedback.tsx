import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackPage() {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!name.trim() || !subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    const mailtoLink = `mailto:sammy.cryptguy@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `From: ${name}\n\n${message}`
    )}`;
    window.open(mailtoLink);
    setSent(true);
    toast.success('Opening email client...');
  };

  if (sent) {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={48} className="text-primary mb-4" />
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Thank You!</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your feedback is being sent via email.
        </p>
        <button
          onClick={() => { setSent(false); setName(''); setSubject(''); setMessage(''); }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h2 className="font-display text-xl font-bold text-foreground mb-2">Send Feedback</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Share your ideas, suggestions, or report issues. We'd love to hear from you!
      </p>

      <div className="space-y-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          maxLength={50}
          className="w-full rounded-lg bg-card border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject"
          maxLength={100}
          className="w-full rounded-lg bg-card border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Your message..."
          maxLength={1000}
          rows={5}
          className="w-full rounded-lg bg-card border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <button
          onClick={handleSend}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          <Send size={16} />
          Send Feedback
        </button>
      </div>
    </div>
  );
}
