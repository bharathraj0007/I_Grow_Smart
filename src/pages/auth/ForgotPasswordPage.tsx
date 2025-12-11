import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { sendPasswordResetEmail: sendResetEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Send password reset email using AuthContext which handles token cleanup
      const result = await sendResetEmail(email);
      
      if (result) {
        setEmailSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      } else {
        throw new Error('Failed to send password reset email');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (err.message?.includes('409') || err.message?.includes('conflict')) {
        errorMessage = 'A password reset is already in progress. Please check your email or try again in a few minutes.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('not found')) {
        // Don't reveal if email exists - security best practice
        errorMessage = 'If an account exists with this email, you will receive a password reset link.';
        // But still show success to prevent email enumeration
        setEmailSent(true);
        toast.success('Password reset email sent! Check your inbox.');
        setLoading(false);
        return;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            {emailSent
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive a password reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                  A password reset link has been sent to <strong>{email}</strong>. 
                  Please check your email and follow the instructions to reset your password.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/signin')} 
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
                <Button 
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Try another email
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or try again.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="farmer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Remember your password? </span>
                <Link to="/signin" className="text-primary hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
