import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { generateOTP, sendOTPEmail, storeOTP, verifyOTP } from '@/utils/otpVerification';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showOTPScreen, setShowOTPScreen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [resendingOTP, setResendingOTP] = useState(false);
  const [otpError, setOtpError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Generate and send OTP
      const otp = generateOTP();
      const otpStored = await storeOTP(formData.email, otp);
      
      if (!otpStored) {
        setError('Failed to generate verification code. Please try again.');
        setLoading(false);
        return;
      }
      
      const emailSent = await sendOTPEmail(formData.email, otp, formData.fullName);
      
      if (!emailSent) {
        setError('Failed to send verification email. Please try again.');
        setLoading(false);
        return;
      }
      
      toast.success('Verification code sent to your email!');
      setShowOTPScreen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    setVerifyingOTP(true);
    setOtpError('');

    try {
      const result = await verifyOTP(formData.email, otpValue);
      
      if (!result.success) {
        setOtpError(result.message);
        setVerifyingOTP(false);
        return;
      }

      // OTP verified - now create the account
      await signUp(formData.email, formData.password, formData.fullName);
      setSuccess(true);
      toast.success('Email verified! Account created successfully.');
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to verify code');
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    setResendingOTP(true);
    setOtpError('');

    try {
      const otp = generateOTP();
      const otpStored = await storeOTP(formData.email, otp);
      
      if (!otpStored) {
        toast.error('Failed to generate verification code');
        setResendingOTP(false);
        return;
      }
      
      const emailSent = await sendOTPEmail(formData.email, otp, formData.fullName);
      
      if (!emailSent) {
        toast.error('Failed to send verification email');
        setResendingOTP(false);
        return;
      }
      
      toast.success('New verification code sent!');
      setOtpValue('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResendingOTP(false);
    }
  };

  const handleBackToForm = () => {
    setShowOTPScreen(false);
    setOtpValue('');
    setOtpError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // OTP Verification Screen
  if (showOTPScreen && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent a 6-digit verification code to<br />
              <strong className="text-foreground">{formData.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {otpError && (
              <Alert variant="destructive">
                <AlertDescription>{otpError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <Label htmlFor="otp">Enter Verification Code</Label>
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    setOtpError('');
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  Code expires in 10 minutes
                </p>
              </div>

              <Button
                onClick={handleVerifyOTP}
                className="w-full"
                disabled={verifyingOTP || otpValue.length !== 6}
              >
                {verifyingOTP ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendOTP}
                  className="w-full"
                  disabled={resendingOTP}
                >
                  {resendingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToForm}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Registration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Email Verified!</CardTitle>
            <CardDescription className="text-center">
              Your account has been created successfully. 
              You can now sign in with your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/signin')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join our farming community today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/signin" className="text-primary hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
