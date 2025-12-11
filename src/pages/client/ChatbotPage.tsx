import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ChatbotPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to external chatbot immediately
    window.open('https://grow-with-bot.lovable.app', '_blank');
    // Optionally navigate back or show a message
    navigate(-1);
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">AI Farming Assistant</h1>
          <p className="text-muted-foreground mb-6">
            Opening advanced chatbot in a new window...
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              <span>Redirecting to Advanced Chatbot</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                You're being redirected to our advanced AI chatbot. If the new window didn't open, click the button below.
              </p>
              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
                <Button 
                  onClick={() => window.open('https://grow-with-bot.lovable.app', '_blank')}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open Chatbot
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
