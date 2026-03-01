import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, MessageSquare, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDailyVerse } from '@/data/bibleData';
import { getDailyTopic, TOPICS } from '@/data/topicsData';

const quickActions = [
  { icon: BookOpen, label: 'Read Bible', path: '/read', desc: 'Explore Scripture' },
  { icon: Search, label: 'Search', path: '/search', desc: 'Find verses' },
  { icon: Lightbulb, label: 'Topics', path: '/topics', desc: 'Study by topic' },
  { icon: MessageSquare, label: 'Community', path: '/community', desc: 'Share ideas' },
];

export default function Index() {
  const dailyVerse = getDailyVerse();
  const dailyTopic = getDailyTopic();

  return (
    <div className="space-y-6 fade-in">
      {/* Daily Verse */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-primary p-6 text-primary-foreground shadow-lg"
      >
        <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Verse of the Day</p>
        <blockquote className="font-display text-xl leading-relaxed font-semibold mb-3">
          "{dailyVerse.text}"
        </blockquote>
        <p className="text-sm opacity-80 font-body">— {dailyVerse.ref}</p>
      </motion.section>

      {/* Daily Topic */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-accent/20 border border-accent/30 p-4"
      >
        <p className="text-xs uppercase tracking-widest text-accent-foreground/70 mb-1">Today's Topic</p>
        <p className="font-display text-lg font-bold text-accent-foreground">{dailyTopic}</p>
        <Link to="/topics" className="text-sm text-primary hover:underline mt-1 inline-block">
          Explore related verses →
        </Link>
      </motion.section>

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(action => (
            <Link
              key={action.path}
              to={action.path}
              className="rounded-xl bg-card border border-border p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              <action.icon size={24} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-display font-bold text-card-foreground text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Featured Topics */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Study Topics</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {TOPICS.slice(0, 6).map(topic => (
            <Link
              key={topic.id}
              to={`/topics?t=${topic.id}`}
              className="flex-shrink-0 rounded-xl bg-card border border-border px-4 py-3 hover:shadow-md transition-all text-center min-w-[100px]"
            >
              <span className="text-2xl block mb-1">{topic.emoji}</span>
              <span className="text-xs font-medium text-card-foreground">{topic.name}</span>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
