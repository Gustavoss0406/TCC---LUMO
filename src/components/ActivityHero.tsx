import React from 'react';
import { motion } from 'motion/react';
import { Zap, Trophy, Target, TrendingUp } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ActivityHeroProps {
  topFocus?: string;
  topFocusTime?: string;
  dailyGoal?: string;
  streak?: number;
  productivity?: string;
}

const ActivityHero: React.FC<ActivityHeroProps> = ({
  topFocus = "N/A",
  topFocusTime = "0h 0m",
  dailyGoal = "0%",
  streak = 0,
  productivity = "0%"
}) => {
  const { theme } = useTheme();
  const cards = [
    {
      id: 1,
      title: "Top Focus",
      subtitle: topFocus,
      value: topFocusTime,
      color: "bg-interactive-accent",
      textColor: "text-interactive-primary",
      iconBg: "bg-interactive-primary/20",
      icon: Zap,
      rotate: 2
    },
    {
      id: 2,
      title: "Daily Goal",
      subtitle: streak > 0 ? "Keep it up!" : "Start today!",
      value: dailyGoal,
      color: "bg-bright-blue",
      textColor: "text-blue-900",
      iconBg: "bg-blue-900/20",
      icon: Target,
      rotate: -2
    },
    {
      id: 3,
      title: "Focus Streak",
      subtitle: "Keep it up",
      value: `${streak} Days`,
      color: "bg-bright-pink",
      textColor: "text-pink-900",
      iconBg: "bg-pink-900/20",
      icon: Trophy,
      rotate: 1
    },
    {
      id: 4,
      title: "Productivity",
      subtitle: "Weekly avg",
      value: productivity,
      color: "bg-bright-yellow",
      textColor: "text-yellow-900",
      iconBg: "bg-yellow-900/20",
      icon: TrendingUp,
      rotate: -1
    }
  ];
  return (
    <div className="w-full overflow-hidden py-4 -mx-6 px-6">
      <div 
        className="flex gap-4 overflow-x-auto pb-8 pt-4 px-2 snap-x snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {cards.map((card, index) => (
          <motion.div 
            key={card.id}
            className={`relative w-64 h-80 ${card.color} rounded-[40px] p-8 flex flex-col justify-between shrink-0 shadow-xl shadow-black/5 border-4 border-white snap-center cursor-pointer overflow-hidden group`}
            initial={{ rotate: card.rotate, opacity: 0, y: 20 }}
            animate={{ rotate: card.rotate, opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", bounce: 0.4 }}
            whileHover={{ scale: 1.02, rotate: 0, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full -ml-12 -mb-12 transition-transform duration-700 group-hover:scale-150" />

            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-2xl ${card.iconBg} backdrop-blur-sm flex items-center justify-center ${card.textColor} mb-4 shadow-sm`}>
                <card.icon size={28} fill="currentColor" className="opacity-80" />
              </div>
              <h3 className={`text-lg font-black uppercase tracking-widest opacity-70 ${card.textColor}`}>{card.title}</h3>
              <p className={`text-2xl font-black tracking-tight ${card.textColor}`}>{card.subtitle}</p>
            </div>

            <div className="relative z-10">
              <motion.p 
                className={`text-6xl font-black tracking-tighter ${card.textColor}`}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 + index * 0.1 }}
              >
                {card.value}
              </motion.p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ActivityHero;
