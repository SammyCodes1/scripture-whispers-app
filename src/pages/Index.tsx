import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, MessageSquare, Search, PlayCircle, ArrowRight, Globe2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDailyVerse } from '@/data/bibleData';
import { getDailyTopic, TOPICS } from '@/data/topicsData';
import { getDailyConfession, getDailyPrayer } from '@/data/confessionsData';
import { Flame } from 'lucide-react';
import StreakCard from '@/components/StreakCard';
import GlossarySection from '@/components/GlossarySection';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { useLastRead } from '@/hooks/useLastRead';
import { formatDistanceToNow } from 'date-fns';

const quickActions = [
  { icon: BookOpen, label: 'Read Bible', path: '/read', desc: 'Explore Scripture', gradient: 'from-primary/15 to-primary/5' },
  { icon: Globe2, label: 'Bible Maps', path: '/maps', desc: '3D biblical places', gradient: 'from-accent/15 to-primary/10' },
  { icon: Search, label: 'Search', path: '/search', desc: 'Find verses', gradient: 'from-accent/15 to-accent/5' },
  { icon: Lightbulb, label: 'Topics', path: '/topics', desc: 'Study by topic', gradient: 'from-primary/10 to-accent/10' },
  { icon: MessageSquare, label: 'Community', path: '/community', desc: 'Share ideas', gradient: 'from-accent/10 to-primary/10' },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function Index() {
  const dailyVerse = getDailyVerse();
  const dailyTopic = getDailyTopic();
  const dailyConfession = getDailyConfession();
  const dailyPrayer = getDailyPrayer();
  const { lastRead } = useLastRead();

  return (
    <motion.div
      className="space-y-5"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Announcements */}
      <AnnouncementBanner />

      {/* Daily Verse */}
      <motion.section variants={fadeUp}>
        <div className="relative rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <p className="text-[11px] uppercase tracking-[0.2em] mb-2 font-medium">Verse of the Day</p>
          <blockquote className="font-display text-lg sm:text-xl leading-relaxed font-semibold mb-3 relative">
            "{dailyVerse.text}"
          </blockquote>
          <p className="text-sm">— {dailyVerse.ref}</p>
        </div>
      </motion.section>

      {/* Biblical Map */}
      <motion.section variants={fadeUp}>
        <Link
          to="/maps"
          className="group relative flex items-center gap-4 rounded-2xl bg-gradient-to-br from-accent/25 to-primary/10 border border-accent/30 p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.99] overflow-hidden"
        >
          <div className="absolute inset-y-0 right-0 w-32 bg-primary/5 rounded-l-full translate-x-10" />
          <div className="relative p-3.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <Globe2 size={28} />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5 font-medium">Explore Scripture</p>
            <p className="font-display text-lg font-bold text-card-foreground">Biblical Map</p>
            <p className="text-sm text-muted-foreground truncate">Interactive 3D globe with biblical locations</p>
          </div>
          <ArrowRight size={18} className="relative text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>
      </motion.section>

      {/* Continue Reading */}
      {lastRead && (
        <motion.section variants={fadeUp}>
          <Link
            to={`/read?book=${encodeURIComponent(lastRead.book)}&chapter=${lastRead.chapter}`}
            className="flex items-center gap-4 rounded-2xl bg-card border border-border/60 p-4 hover:shadow-lg transition-all hover:-translate-y-0.5 group active:scale-[0.99]"
          >
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:from-primary group-hover:to-primary group-hover:text-primary-foreground transition-all duration-300">
              <PlayCircle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5 font-medium">Continue Reading</p>
              <p className="font-display font-bold text-card-foreground truncate">
                {lastRead.book} {lastRead.chapter}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(lastRead.timestamp, { addSuffix: true })}
              </p>
            </div>
            <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </motion.section>
      )}

      {/* Reading Streak */}
      <motion.section variants={fadeUp}>
        <StreakCard />
      </motion.section>

      {/* Daily Confession & Prayer */}
      <motion.section variants={fadeUp}>
        <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Flame size={16} className="text-primary" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Today's Confession</p>
          </div>
          <p className="font-display text-base font-bold text-foreground">{dailyConfession.title}</p>
          <p className="text-sm leading-relaxed text-foreground/90">{dailyConfession.confession}</p>
          <p className="text-xs italic text-muted-foreground">📖 {dailyConfession.scriptureRef}</p>

          <div className="border-t border-border/40 pt-4 mt-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">🙏 Today's Prayer</p>
            <p className="text-sm leading-relaxed text-foreground/90">{dailyPrayer.prayer}</p>
            <p className="text-xs italic text-muted-foreground mt-1">📖 {dailyPrayer.scriptureRef}</p>
          </div>

          <Link to="/confessions" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium group">
            View all confessions & prayers
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </motion.section>

      {/* Daily Topic */}
      <motion.section variants={fadeUp}>
        <div className="rounded-2xl bg-gradient-to-br from-accent/15 to-transparent border border-accent/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1 font-medium">Today's Topic</p>
          <p className="font-display text-lg font-bold text-foreground">{dailyTopic}</p>
          <Link to="/topics" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2 font-medium group">
            Explore related verses
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </motion.section>

      {/* Quick Actions */}
      <motion.section variants={fadeUp}>
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(action => (
            <Link
              key={action.path}
              to={action.path}
              className="rounded-2xl bg-card border border-border/60 p-4 hover:shadow-lg transition-all hover:-translate-y-1 group active:scale-[0.98]"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.gradient} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon size={20} className="text-primary" />
              </div>
              <p className="font-display font-bold text-card-foreground text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Featured Topics */}
      <motion.section variants={fadeUp}>
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Study Topics</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          {TOPICS.slice(0, 6).map(topic => (
            <Link
              key={topic.id}
              to={`/topics?t=${topic.id}`}
              className="flex-shrink-0 snap-start rounded-2xl bg-card border border-border/60 px-5 py-3.5 hover:shadow-lg transition-all text-center min-w-[110px] active:scale-95"
            >
              <span className="text-2xl block mb-1.5">{topic.emoji}</span>
              <span className="text-xs font-semibold text-card-foreground">{topic.name}</span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Glossary */}
      <motion.section variants={fadeUp}>
        <GlossarySection />
      </motion.section>
    </motion.div>
  );
}
