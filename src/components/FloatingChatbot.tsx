import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FloatingChatbot() {
  const handleChatbotClick = () => {
    // Directly redirect to external chatbot
    window.open('https://grow-with-bot.lovable.app', '_blank');
  };

  return (
    <Button
      onClick={handleChatbotClick}
      className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-shadow"
      title="Open AI Assistant"
    >
      <Sparkles className="w-6 h-6" />
    </Button>
  );
}
