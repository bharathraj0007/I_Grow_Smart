import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, HelpCircle, CheckCircle, MessageSquare, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SupportPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    
    setLoadingTickets(true);
    try {
      const data = await blink.db.supportTickets.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('Fetched tickets from database:', data); // Debug log
      
      // Map database fields (snake_case) to interface (camelCase)
      const mappedTickets = data.map((ticket: any) => {
        console.log('Processing ticket:', ticket.id, 'Admin response:', ticket.adminResponse); // Debug log
        return {
          id: ticket.id,
          subject: ticket.subject,
          message: ticket.message,
          priority: ticket.priority,
          status: ticket.status,
          adminResponse: ticket.adminResponse || null, // Blink SDK auto-converts snake_case to camelCase
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt
        };
      });
      
      console.log('Mapped tickets:', mappedTickets); // Debug log
      setTickets(mappedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load your tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to submit a support ticket');
      return;
    }

    setLoading(true);

    try {
      await blink.db.supportTickets.create({
        userId: user.id,
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority,
        status: 'open'
      });

      setSubmitted(true);
      toast.success('Support ticket submitted successfully!');
      setFormData({ subject: '', message: '', priority: 'medium' });
      fetchTickets(); // Refresh ticket list
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Support Center</h1>
          <p className="text-muted-foreground">
            Need help? Submit a ticket and our team will get back to you soon
          </p>
        </div>

        {!user ? (
          <Alert>
            <AlertDescription>
              Please sign in to view your support tickets and submit new ones
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tickets">
                <MessageSquare className="w-4 h-4 mr-2" />
                My Tickets ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="new">
                <HelpCircle className="w-4 h-4 mr-2" />
                New Ticket
              </TabsTrigger>
            </TabsList>

            {/* My Tickets Tab */}
            <TabsContent value="tickets" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Your Support Tickets</h2>
                <Button 
                  variant="outline" 
                  onClick={fetchTickets}
                  disabled={loadingTickets}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingTickets ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              {loadingTickets ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tickets Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't submitted any support tickets
                    </p>
                    <Button onClick={() => document.querySelector<HTMLButtonElement>('[value="new"]')?.click()}>
                      Create Your First Ticket
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{ticket.subject}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority.toUpperCase()} PRIORITY
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* User Message */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">Your Message:</span>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                        </div>
                      </div>

                      {/* Admin Response */}
                      {ticket.adminResponse ? (
                        <>
                          <Separator />
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-600">Admin Response:</span>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                              <p className="text-sm whitespace-pre-wrap">{ticket.adminResponse}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Responded on {new Date(ticket.updatedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">
                              Waiting for admin response. We typically respond within 24-48 hours.
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* New Ticket Tab */}
            <TabsContent value="new">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Form */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Submit a Ticket</CardTitle>
                    <CardDescription>
                      Describe your issue and we'll help you resolve it
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {submitted ? (
                      <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Ticket Submitted!</h3>
                        <p className="text-muted-foreground mb-4">
                          We've received your request and will respond within 24-48 hours.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={() => setSubmitted(false)}>
                            Submit Another Ticket
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => document.querySelector<HTMLButtonElement>('[value="tickets"]')?.click()}
                          >
                            View My Tickets
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Input
                            id="subject"
                            placeholder="Brief description of your issue"
                            value={formData.subject}
                            onChange={(e) => handleChange('subject', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => handleChange('priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            placeholder="Provide details about your issue..."
                            rows={6}
                            value={formData.message}
                            onChange={(e) => handleChange('message', e.target.value)}
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Ticket'
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* FAQ Section */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        <span>Quick Help</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-1">Response Time</h4>
                        <p className="text-sm text-muted-foreground">
                          We typically respond within 24-48 hours
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Email Support</h4>
                        <p className="text-sm text-muted-foreground">
                          support@agrismart.com
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Phone Support</h4>
                        <p className="text-sm text-muted-foreground">
                          +91-XXXX-XXXXXX<br />
                          Mon-Fri, 9 AM - 6 PM IST
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Common Issues</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Can't access features?</h4>
                        <p className="text-xs text-muted-foreground">
                          Make sure you're signed in and have verified your email
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Incorrect recommendations?</h4>
                        <p className="text-xs text-muted-foreground">
                          Double-check your input values for accuracy
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Account issues?</h4>
                        <p className="text-xs text-muted-foreground">
                          Contact us with your registered email
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
