import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, User, MapPin, Phone, Tractor, Save } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const FARMING_TYPES = [
  'Crop Farming',
  'Livestock Farming',
  'Mixed Farming',
  'Organic Farming',
  'Hydroponics',
  'Aquaculture',
  'Dairy Farming',
  'Poultry Farming'
];

export default function ProfileSettingsPage() {
  const { user, profile, updateProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    state: '',
    district: '',
    farmSize: '',
    farmingType: ''
  });

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (isAdmin) {
      toast.info('Admin users do not have access to profile settings');
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        state: profile.state || '',
        district: profile.district || '',
        farmSize: profile.farmSize?.toString() || '',
        farmingType: profile.farmingType || ''
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.phoneNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        state: formData.state,
        district: formData.district,
        farmSize: formData.farmSize ? parseFloat(formData.farmSize) : 0,
        farmingType: formData.farmingType
      });
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Admin users do not have access to profile settings
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information and farming details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your profile to get personalized crop recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Email (Read-only) */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleChange('state', value)}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="district"
                  type="text"
                  placeholder="Enter your district"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Farm Size */}
            <div className="space-y-2">
              <Label htmlFor="farmSize">Farm Size (in acres)</Label>
              <div className="relative">
                <Tractor className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="farmSize"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter farm size"
                  value={formData.farmSize}
                  onChange={(e) => handleChange('farmSize', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Farming Type */}
            <div className="space-y-2">
              <Label htmlFor="farmingType">Farming Type</Label>
              <Select
                value={formData.farmingType}
                onValueChange={(value) => handleChange('farmingType', value)}
              >
                <SelectTrigger id="farmingType">
                  <SelectValue placeholder="Select farming type" />
                </SelectTrigger>
                <SelectContent>
                  {FARMING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
