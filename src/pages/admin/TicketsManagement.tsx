import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { SupportTicket } from '@/types';

export default function TicketsManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [activeTab, setActiveTab] = useState('open');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await blink.db.supportTickets.list<SupportTicket>({
        orderBy: { createdAt: 'desc' },
        limit: 1000  // Increased limit to fetch all support tickets
      });
      console.log(`✓ Fetched ${data.length} support tickets`);
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.adminResponse || '');
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      await blink.db.supportTickets.update(selectedTicket.id, {
        adminResponse: responseText,
        status: 'resolved'
      });
      toast.success('Response sent and ticket marked as resolved');
      setResponseDialogOpen(false);
      setResponseText('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await blink.db.supportTickets.update(ticketId, {
        status: newStatus
      });
      toast.success('Ticket status updated');
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleUpdatePriority = async (ticketId: string, newPriority: string) => {
    try {
      await blink.db.supportTickets.update(ticketId, {
        priority: newPriority
      });
      toast.success('Priority updated');
      fetchTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <MessageSquare className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterTicketsByStatus = (status: string) => {
    if (status === 'all') return tickets;
    return tickets.filter(t => t.status === status);
  };

  const openTickets = filterTicketsByStatus('open');
  const inProgressTickets = filterTicketsByStatus('in_progress');
  const resolvedTickets = filterTicketsByStatus('resolved');
  const closedTickets = filterTicketsByStatus('closed');

  const TicketsTable = ({ ticketsList }: { ticketsList: SupportTicket[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ticketsList.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="max-w-md">
              <div>
                <div className="font-medium">{ticket.subject}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {ticket.message?.substring(0, 80)}...
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Select
                value={ticket.priority || 'medium'}
                onValueChange={(value) => handleUpdatePriority(ticket.id, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <Badge className={getPriorityColor('low')}>Low</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge className={getPriorityColor('medium')}>Medium</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge className={getPriorityColor('high')}>High</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select
                value={ticket.status || 'open'}
                onValueChange={(value) => handleUpdateStatus(ticket.id, value)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon('open')}
                      <span>Open</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon('in_progress')}
                      <span>In Progress</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon('resolved')}
                      <span>Resolved</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="closed">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon('closed')}
                      <span>Closed</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                onClick={() => handleRespond(ticket)}
              >
                {ticket.adminResponse ? 'View/Edit Response' : 'Respond'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Support Tickets Management</h1>
          <p className="text-muted-foreground">Manage and respond to farmer queries and issues</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{openTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{inProgressTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{resolvedTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="open">
                  Open ({openTickets.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({inProgressTickets.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({resolvedTickets.length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedTickets.length})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All ({tickets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="open">
                <TicketsTable ticketsList={openTickets} />
              </TabsContent>
              <TabsContent value="in_progress">
                <TicketsTable ticketsList={inProgressTickets} />
              </TabsContent>
              <TabsContent value="resolved">
                <TicketsTable ticketsList={resolvedTickets} />
              </TabsContent>
              <TabsContent value="closed">
                <TicketsTable ticketsList={closedTickets} />
              </TabsContent>
              <TabsContent value="all">
                <TicketsTable ticketsList={tickets} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket?.adminResponse ? 'View/Edit Response' : 'Respond to Ticket'}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket?.adminResponse ? 'View or edit your response to this support ticket.' : 'Provide a response to help resolve this support ticket.'}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <form onSubmit={handleSubmitResponse} className="space-y-4">
              {/* Ticket Details */}
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Subject</Label>
                  <p className="font-medium">{selectedTicket.subject}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Message from Farmer</Label>
                  <p className="text-sm">{selectedTicket.message}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Priority</Label>
                    <Badge className={getPriorityColor(selectedTicket.priority || 'medium')}>
                      {selectedTicket.priority || 'medium'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge className={getStatusColor(selectedTicket.status || 'open')}>
                      {selectedTicket.status || 'open'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Created</Label>
                    <p className="text-sm">
                      {selectedTicket.createdAt 
                        ? new Date(selectedTicket.createdAt).toLocaleString() 
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Response */}
              <div className="space-y-2">
                <Label htmlFor="response">Your Response *</Label>
                <Textarea
                  id="response"
                  rows={6}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response to the farmer..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setResponseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Send Response & Mark Resolved
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
