import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, MailX } from 'lucide-react';
import { verifyEmailToken } from '@/utils/nodeMailerVerification';
import toast from 'react-hot-toast';
import { blink } from '@/lib/blink';

type Status = 'loading' | 'success' | 'error' | 'idle';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Check URL parameter first, then fallback to localStorage (for testing mode)
      let token = searchParams.get('token');
      
      if (!token) {
        // Try to get fallback token from localStorage (testing mode)
        token = localStorage.getItem('verificationFallbackToken');
        if (token) {
          console.log('Using fallback token from testing mode');
        }
      }

      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification link.');
        return;
      }

      try {
        console.log('Verifying email token...');
        const result = await verifyEmailToken(token);

        if (result.success) {
          setStatus('success');
          setEmail(result.email || '');
          setMessage(result.message || 'Email verified successfully!');
          toast.success('Email verified! Redirecting...');

          // Redirect to signin after 3 seconds
          setTimeout(() => {
            navigate('/signin', {
              state: {
                message: 'Email verified! You can now sign in.'
              }
            });
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to verify email.');
          toast.error(result.message);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(
          error instanceof Error ? error.message : 'An error occurred during verification.'
        );
        toast.error('Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              This should only take a moment.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>

            {email && (
              <p className="text-sm text-muted-foreground text-center">
                Email: <strong>{email}</strong>
              </p>
            )}

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Redirecting you to sign in...
              </p>

              <Button 
                className="w-full" 
                onClick={() => navigate('/signin')}
              >
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <MailX className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verification Failed</CardTitle>
          <CardDescription>
            We couldn't verify your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground text-center">
            Please try one of the following:
          </p>

          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Check the link is correct and hasn't expired</li>
            <li>• Request a new verification email</li>
            <li>• Contact support if the problem persists</li>
          </ul>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => navigate('/signup')}
            >
              Back to Sign Up
            </Button>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/signin')}
            >
              Go to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
