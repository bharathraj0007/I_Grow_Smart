import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calendar, User, FileText } from 'lucide-react';
import type { Newsletter } from '@/types';

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const fetchNewsletters = async () => {
    try {
      const data = await blink.db.newsletters.list<Newsletter>({
        where: { isPublished: '1' },
        orderBy: { publishedDate: 'desc' },
        limit: 50
      });
      setNewsletters(data);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNewsletters = newsletters.filter(newsletter =>
    newsletter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    newsletter.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Agriculture News & Updates</h1>
          <p className="text-muted-foreground">
            Stay informed with the latest news, tips, and insights for farmers
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex justify-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Published Newsletters Grid */}
        {newsletters.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Published Articles</h2>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-40 w-full mb-4 rounded" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredNewsletters.length > 0 ? (
            filteredNewsletters.map((newsletter) => (
              <Link to={`/newsletters/${newsletter.id}`} key={newsletter.id}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {newsletter.imageUrl && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={newsletter.imageUrl}
                        alt={newsletter.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                      {newsletter.publishedDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(newsletter.publishedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {newsletter.author && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{newsletter.author}</span>
                        </div>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">{newsletter.title}</CardTitle>
                    {newsletter.category && (
                      <Badge variant="secondary" className="w-fit mt-2">
                        {newsletter.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3">
                      {newsletter.excerpt || 'Click to read more...'}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No newsletters found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
