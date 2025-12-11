import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Eye, Calendar, Sparkles, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Newsletter } from '@/types';

interface NewsArticle {
  title: string;
  summary: string;
  content: string;
  source: string;
  category: string;
  publishedAt?: string; // ISO date string from GNews API
}

export default function NewslettersManagement() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    category: '',
    author: '',
    publishedDate: '',
    isPublished: true
  });
  const [fetchingNews, setFetchingNews] = useState(false);
  const [aiNews, setAiNews] = useState<NewsArticle[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newsletterToDelete, setNewsletterToDelete] = useState<Newsletter | null>(null);

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      const data = await blink.db.newsletters.list<Newsletter>({
        orderBy: { createdAt: 'desc' },
        limit: 1000  // Increased limit to fetch all newsletters
      });
      console.log(`✓ Fetched ${data.length} newsletters`);
      setNewsletters(data);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
      toast.error('Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newsletterData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        imageUrl: formData.imageUrl || undefined,
        category: formData.category || undefined,
        author: formData.author || 'Admin',
        publishedDate: formData.publishedDate || new Date().toISOString(),
        isPublished: formData.isPublished ? '1' : '0'
      };

      if (editingNewsletter) {
        await blink.db.newsletters.update(editingNewsletter.id, newsletterData);
        toast.success('Newsletter updated successfully');
      } else {
        await blink.db.newsletters.create(newsletterData);
        toast.success('Newsletter added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchNewsletters();
    } catch (error) {
      console.error('Error saving newsletter:', error);
      toast.error('Failed to save newsletter');
    }
  };

  const handleEdit = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData({
      title: newsletter.title || '',
      content: newsletter.content || '',
      excerpt: newsletter.excerpt || '',
      imageUrl: newsletter.imageUrl || '',
      category: newsletter.category || '',
      author: newsletter.author || '',
      publishedDate: newsletter.publishedDate 
        ? new Date(newsletter.publishedDate).toISOString().split('T')[0] 
        : '',
      isPublished: newsletter.isPublished === '1'
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (newsletter: Newsletter) => {
    setNewsletterToDelete(newsletter);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!newsletterToDelete) return;

    try {
      await blink.db.newsletters.delete(newsletterToDelete.id);
      toast.success('Newsletter deleted successfully');
      fetchNewsletters();
      setDeleteDialogOpen(false);
      setNewsletterToDelete(null);
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      toast.error('Failed to delete newsletter');
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    try {
      await blink.db.newsletters.update(id, {
        isPublished: currentStatus === '1' ? '0' : '1'
      });
      toast.success('Newsletter status updated');
      fetchNewsletters();
    } catch (error) {
      console.error('Error updating newsletter:', error);
      toast.error('Failed to update newsletter');
    }
  };

  const resetForm = () => {
    setEditingNewsletter(null);
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      category: '',
      author: '',
      publishedDate: '',
      isPublished: true
    });
  };

  const fetchAINews = async () => {
    setFetchingNews(true);
    try {
      const timestamp = Date.now();
      
      console.log(`[${new Date().toISOString()}] Fetching news from GNews API...`);
      
      // Fetch from GNews API only - via edge function proxy
      const response = await fetch(`https://m80q4b8r--gnews-proxy.functions.blink.new?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'agriculture OR farmers OR farming OR crops OR agricultural',
          lang: 'en',
          country: 'in',
          max: 10,
          sortBy: 'publishedAt'
        })
      });

      if (!response.ok) {
        throw new Error(`GNews API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data?.articles || data.articles.length === 0) {
        toast.error('No articles found from GNews API');
        return;
      }

      console.log(`[GNews] Found ${data.articles.length} articles`);
      
      // Process GNews results
      const articles: NewsArticle[] = data.articles.map((article: any) => ({
        title: article.title,
        summary: article.description || article.content?.substring(0, 200) + '...',
        content: article.content || article.description || 'No content available',
        source: article.source?.name || 'GNews',
        category: 'Agriculture News',
        publishedAt: article.publishedAt
      }));

      // Sort by published date (newest first)
      articles.sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });

      setAiNews(articles);
      setShowAiPanel(true);
      toast.success(`Found ${articles.length} latest agriculture news from GNews`);
    } catch (error) {
      console.error('Error fetching news from GNews:', error);
      toast.error('Failed to fetch news from GNews. Please try again.');
    } finally {
      setFetchingNews(false);
    }
  };

  const useAINewsArticle = (article: NewsArticle) => {
    setFormData({
      title: article.title,
      content: article.content,
      excerpt: article.summary,
      imageUrl: '',
      category: article.category,
      author: article.source || 'AI Generated',
      publishedDate: new Date().toISOString().split('T')[0],
      isPublished: false
    });
    setShowAiPanel(false);
    setDialogOpen(true);
    toast.success('Article content loaded into editor');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Newsletters Management</h1>
          <p className="text-muted-foreground">Create and manage agriculture news and updates</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchAINews}
            disabled={fetchingNews}
            variant="outline"
          >
            {fetchingNews ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching News...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Fetch Latest News
              </>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Newsletter
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNewsletter ? 'Edit Newsletter' : 'Add New Newsletter'}
              </DialogTitle>
              <DialogDescription>
                {editingNewsletter ? 'Update the newsletter details below.' : 'Create a new newsletter article for farmers.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter newsletter title..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief summary (shown in listing)..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Full newsletter content..."
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
                    placeholder="e.g., Technology, Market News"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishedDate">Published Date</Label>
                  <Input
                    id="publishedDate"
                    type="date"
                    value={formData.publishedDate}
                    onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                />
                <Label htmlFor="isPublished">Publish immediately</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingNewsletter ? 'Update' : 'Add'} Newsletter
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI News Panel */}
      {showAiPanel && aiNews.length > 0 && (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>AI-Fetched Latest Farmers News</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAiPanel(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                AI has found {aiNews.length} latest news articles. Click "Use This Article" to create a newsletter from any article below.
              </AlertDescription>
            </Alert>
            <div className="grid gap-4">
              {aiNews.map((article, index) => (
                <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary">{article.category}</Badge>
                          <Badge variant="outline">{article.source}</Badge>
                          {article.publishedAt && (
                            <Badge variant="default" className="bg-green-600">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{article.summary}</p>
                      </div>
                      <Button
                        onClick={() => useAINewsArticle(article)}
                        size="sm"
                        className="ml-4"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Use This Article
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {article.content.substring(0, 300)}...
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button onClick={fetchAINews} disabled={fetchingNews} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${fetchingNews ? 'animate-spin' : ''}`} />
                Fetch More News
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Newsletters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{newsletters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {newsletters.filter(n => n.isPublished === '1').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">
              {newsletters.filter(n => n.isPublished !== '1').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Newsletters Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Newsletters ({newsletters.length})</CardTitle>
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
                  <TableHead>Author</TableHead>
                  <TableHead>Published Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newsletters.map((newsletter) => (
                  <TableRow key={newsletter.id}>
                    <TableCell className="font-medium max-w-sm">
                      <div className="flex items-center space-x-2">
                        {newsletter.imageUrl && (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="truncate">{newsletter.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {newsletter.category ? (
                        <Badge variant="outline">{newsletter.category}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{newsletter.author || 'Admin'}</TableCell>
                    <TableCell>
                      {newsletter.publishedDate ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(newsletter.publishedDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newsletter.isPublished === '1'}
                          onCheckedChange={() => handleTogglePublish(
                            newsletter.id, 
                            newsletter.isPublished || '0'
                          )}
                        />
                        <Badge variant={newsletter.isPublished === '1' ? 'default' : 'secondary'}>
                          {newsletter.isPublished === '1' ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(newsletter)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(newsletter)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the newsletter <span className="font-semibold text-foreground">"{newsletterToDelete?.title}"</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setNewsletterToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Newsletter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
