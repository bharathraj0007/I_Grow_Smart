import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';
import type { GovernmentScheme } from '@/types';

export default function SchemesManagement() {
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<GovernmentScheme | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eligibility: '',
    benefits: '',
    howToApply: '',
    deadline: '',
    state: '',
    category: '',
    officialLink: '',
    isActive: true
  });

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      const data = await blink.db.governmentSchemes.list<GovernmentScheme>({
        orderBy: { createdAt: 'desc' },
        limit: 1000  // Increased limit to fetch all schemes
      });
      console.log(`✓ Fetched ${data.length} government schemes`);
      setSchemes(data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
      toast.error('Failed to load schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const schemeData = {
        title: formData.title,
        description: formData.description,
        eligibility: formData.eligibility,
        benefits: formData.benefits,
        howToApply: formData.howToApply,
        deadline: formData.deadline || undefined,
        state: formData.state || undefined,
        category: formData.category || undefined,
        officialLink: formData.officialLink || undefined,
        isActive: formData.isActive ? '1' : '0'
      };

      if (editingScheme) {
        await blink.db.governmentSchemes.update(editingScheme.id, schemeData);
        toast.success('Scheme updated successfully');
      } else {
        await blink.db.governmentSchemes.create(schemeData);
        toast.success('Scheme added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchSchemes();
    } catch (error) {
      console.error('Error saving scheme:', error);
      toast.error('Failed to save scheme');
    }
  };

  const handleEdit = (scheme: GovernmentScheme) => {
    setEditingScheme(scheme);
    setFormData({
      title: scheme.title || '',
      description: scheme.description || '',
      eligibility: scheme.eligibility || '',
      benefits: scheme.benefits || '',
      howToApply: scheme.howToApply || '',
      deadline: scheme.deadline || '',
      state: scheme.state || '',
      category: scheme.category || '',
      officialLink: scheme.officialLink || '',
      isActive: scheme.isActive === '1'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheme?')) return;

    try {
      await blink.db.governmentSchemes.delete(id);
      toast.success('Scheme deleted successfully');
      fetchSchemes();
    } catch (error) {
      console.error('Error deleting scheme:', error);
      toast.error('Failed to delete scheme');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: string) => {
    try {
      await blink.db.governmentSchemes.update(id, {
        isActive: currentStatus === '1' ? '0' : '1'
      });
      toast.success('Scheme status updated');
      fetchSchemes();
    } catch (error) {
      console.error('Error updating scheme:', error);
      toast.error('Failed to update scheme');
    }
  };

  const resetForm = () => {
    setEditingScheme(null);
    setFormData({
      title: '',
      description: '',
      eligibility: '',
      benefits: '',
      howToApply: '',
      deadline: '',
      state: '',
      category: '',
      officialLink: '',
      isActive: true
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Government Schemes Management</h1>
          <p className="text-muted-foreground">Manage agricultural schemes and subsidies</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Scheme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingScheme ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
              <DialogDescription>
                {editingScheme ? 'Update the government scheme details below.' : 'Add a new government scheme to help farmers access benefits.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Scheme Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., PM-KISAN Samman Nidhi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the scheme..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Subsidy, Insurance, Loan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g., All India, Maharashtra"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibility">Eligibility Criteria *</Label>
                <Textarea
                  id="eligibility"
                  rows={3}
                  value={formData.eligibility}
                  onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  placeholder="Who can apply for this scheme..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits *</Label>
                <Textarea
                  id="benefits"
                  rows={3}
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="What benefits farmers will receive..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="howToApply">How to Apply *</Label>
                <Textarea
                  id="howToApply"
                  rows={3}
                  value={formData.howToApply}
                  onChange={(e) => setFormData({ ...formData, howToApply: e.target.value })}
                  placeholder="Step-by-step application process..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Application Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officialLink">Official Link</Label>
                  <Input
                    id="officialLink"
                    type="url"
                    value={formData.officialLink}
                    onChange={(e) => setFormData({ ...formData, officialLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active (visible to users)</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingScheme ? 'Update' : 'Add'} Scheme
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Schemes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{schemes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Schemes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {schemes.filter(s => s.isActive === '1').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inactive Schemes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">
              {schemes.filter(s => s.isActive !== '1').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schemes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Schemes ({schemes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.map((scheme) => (
                  <TableRow key={scheme.id}>
                    <TableCell className="font-medium max-w-xs">
                      <div>
                        {scheme.title}
                        {scheme.officialLink && (
                          <a 
                            href={scheme.officialLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline inline-flex items-center"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{scheme.category || '-'}</TableCell>
                    <TableCell>{scheme.state || 'All India'}</TableCell>
                    <TableCell>
                      {scheme.deadline 
                        ? new Date(scheme.deadline).toLocaleDateString() 
                        : 'Open'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={scheme.isActive === '1'}
                          onCheckedChange={() => handleToggleActive(scheme.id, scheme.isActive || '0')}
                        />
                        <Badge variant={scheme.isActive === '1' ? 'default' : 'secondary'}>
                          {scheme.isActive === '1' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(scheme)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(scheme.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
