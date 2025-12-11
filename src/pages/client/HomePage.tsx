import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sprout, TrendingUp, Bug, BookOpen, FileText, MessageSquare, Award, HelpCircle, Leaf } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Sprout,
      title: 'Crop Recommendation',
      description: 'AI-powered recommendations based on soil and weather conditions',
      link: '/crop-recommendation',
      color: 'text-green-600'
    },
    {
      icon: TrendingUp,
      title: 'Price Prediction',
      description: 'Predict future crop prices to maximize profits',
      link: '/price-prediction',
      color: 'text-blue-600'
    },
    {
      icon: Bug,
      title: 'Disease Detection',
      description: 'Identify crop diseases early and get treatment recommendations',
      link: '/disease-prediction',
      color: 'text-red-600'
    },
    {
      icon: Leaf,
      title: 'Plant Identification',
      description: 'Identify plants using AI-powered Plant ID technology',
      link: '/plant-identification',
      color: 'text-green-500'
    },
    {
      icon: BookOpen,
      title: 'Marketing Guide',
      description: 'Learn about marketing strategies for different crops',
      link: '/marketing',
      color: 'text-purple-600'
    },
    {
      icon: Award,
      title: 'Government Schemes',
      description: 'Explore available schemes and subsidies for farmers',
      link: '/schemes',
      color: 'text-orange-600'
    },
    {
      icon: FileText,
      title: 'Newsletters',
      description: 'Stay updated with latest agriculture news and tips',
      link: '/newsletters',
      color: 'text-indigo-600'
    },
    {
      icon: MessageSquare,
      title: 'AI Chatbot',
      description: 'Get instant answers to your farming questions',
      link: '/chatbot',
      color: 'text-cyan-600'
    },
    {
      icon: HelpCircle,
      title: 'Support',
      description: 'Need help? Contact our support team',
      link: '/support',
      color: 'text-pink-600'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/15 via-secondary/20 to-accent/15 py-24 relative overflow-hidden farming-pattern">
        {/* Decorative farming elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-secondary/40 px-4 py-2 rounded-full border border-secondary/60">
                <Sprout className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">Grow with Innovation</span>
              </div>
            </div>
            <h1 className="text-6xl font-bold mb-6 text-foreground font-serif leading-tight">
              Empower Your Farming Journey
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Transform your agricultural practices with AI-powered insights, real-time crop recommendations, 
              market intelligence, and expert support tailored for modern farmers
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" className="text-lg px-8 bg-primary hover:bg-primary/90 text-white">
                <Link to="/crop-recommendation" className="flex items-center gap-2">
                  <Sprout className="w-5 h-5" />
                  Get Started
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-accent text-accent hover:bg-accent/10" onClick={() => window.open('https://grow-with-bot.lovable.app', '_blank')}>
                <MessageSquare className="w-5 h-5" />
                Talk to AI
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gradient-to-b from-transparent via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold font-serif text-foreground mb-4">
              Comprehensive Farming Solutions
            </h2>
            <p className="text-lg text-muted-foreground">
              Discover our suite of intelligent tools designed to optimize every aspect of your agricultural operation
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link to={feature.link} key={index}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/50 hover:border-l-primary soil-texture overflow-hidden group">
                  <CardHeader>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <feature.icon className={`w-14 h-14 relative ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-primary/5 via-secondary/10 to-accent/5 py-20 border-t-2 border-primary/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { stat: '10,000+', label: 'Farmers Empowered', icon: '👨‍🌾' },
              { stat: '50+', label: 'Crop Varieties', icon: '🌾' },
              { stat: '95%', label: 'Accuracy Rate', icon: '📈' }
            ].map((item, idx) => (
              <div key={idx} className="text-center p-6 rounded-lg bg-card/50 backdrop-blur hover:bg-card transition-all border border-primary/10 hover:border-primary/30">
                <div className="text-5xl mb-4">{item.icon}</div>
                <div className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
                  {item.stat}
                </div>
                <div className="text-lg text-muted-foreground font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
