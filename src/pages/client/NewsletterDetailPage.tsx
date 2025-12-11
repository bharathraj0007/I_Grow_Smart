import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Newsletter } from '@/types';

export default function NewsletterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchNewsletter();
    }
  }, [id]);

  const fetchNewsletter = async () => {
    try {
      setLoading(true);
      const data = await blink.db.newsletters.list<Newsletter>({
        where: { id: id, isPublished: '1' },
        limit: 1
      });
      
      if (data.length > 0) {
        setNewsletter(data[0]);
      } else {
        toast.error('Newsletter not found');
        navigate('/newsletters');
      }
    } catch (error) {
      console.error('Error fetching newsletter:', error);
      toast.error('Failed to load newsletter');
      navigate('/newsletters');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-64 w-full mb-4 rounded" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Newsletter Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The newsletter you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/newsletters')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Newsletters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/newsletters')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Newsletters
      </Button>

      <Card>
        {/* Featured Image */}
        {newsletter.imageUrl && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img
              src={newsletter.imageUrl}
              alt={newsletter.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardHeader className="space-y-4">
          {/* Category Badge */}
          {newsletter.category && (
            <Badge variant="secondary" className="w-fit">
              {newsletter.category}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {newsletter.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {newsletter.publishedDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(newsletter.publishedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            {newsletter.author && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{newsletter.author}</span>
              </div>
            )}
          </div>

          {/* Excerpt */}
          {newsletter.excerpt && (
            <p className="text-lg text-muted-foreground italic border-l-4 border-primary pl-4">
              {newsletter.excerpt}
            </p>
          )}
        </CardHeader>

        <CardContent>
          {/* Full Content */}
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            style={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
              fontSize: '1.05rem'
            }}
          >
            {newsletter.content ? (
              newsletter.content.split('\n').map((paragraph, index) => (
                paragraph.trim() ? (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ) : null
              ))
            ) : (
              <p className="text-muted-foreground">No content available.</p>
            )}
          </div>

          {/* Back Button at Bottom */}
          <div className="mt-8 pt-8 border-t">
            <Button onClick={() => navigate('/newsletters')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Newsletters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
