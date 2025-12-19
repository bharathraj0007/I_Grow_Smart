import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blink } from '@/lib/blink';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, ShoppingCart, Store, Plus, Phone, MapPin, Package, IndianRupee, Mail, CheckCircle, XCircle, Clock, Pencil, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleDatabaseCreate, getUserFriendlyErrorMessage } from '@/utils/errorHandler';
import { openWhatsAppChat } from '@/utils/whatsappHelper';
import type { Crop } from '@/types';

interface CropListing {
  id: string;
  userId: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  cropId?: string;
  cropName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  description?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

interface CropOffer {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress?: string;
  offeredPrice: number;
  quantity: number;
  message?: string;
  status: string;
  createdAt: string;
}

export default function MarketingPage() {
  const { user } = useAuth();
  const { addToCart, isInCart } = useCart();
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [listings, setListings] = useState<CropListing[]>([]);
  const [myListings, setMyListings] = useState<CropListing[]>([]);
  const [myListingOffers, setMyListingOffers] = useState<Record<string, CropOffer[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<CropListing | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [isCropDetailDialogOpen, setIsCropDetailDialogOpen] = useState(false);
  const [isEditCropDialogOpen, setIsEditCropDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submittingCrop, setSubmittingCrop] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // State for listing image upload
  const [listingImageFile, setListingImageFile] = useState<File | null>(null);
  const [listingImagePreview, setListingImagePreview] = useState<string>('');
  const [listingImageUrl, setListingImageUrl] = useState<string>('');
  const [uploadingListingImage, setUploadingListingImage] = useState(false);

  // Form state for creating listing
  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    unit: 'kg',
    pricePerUnit: '',
    description: '',
    sellerName: '',
    sellerPhone: '',
    sellerLocation: ''
  });

  // Form state for buying
  const [buyerData, setBuyerData] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerAddress: '',
    offeredPrice: '',
    quantity: '',
    message: ''
  });

  // Form state for editing crop
  const [cropFormData, setCropFormData] = useState({
    name: '',
    scientificName: '',
    description: '',
    optimalN: '',
    optimalP: '',
    optimalK: '',
    optimalTemp: '',
    optimalHumidity: '',
    optimalRainfall: '',
    optimalPh: '',
    suitableSoilTypes: '',
    season: '',
    marketPrice: '',
    cultivationTips: ''
  });

  useEffect(() => {
    fetchCrops();
    fetchListings();
    if (user) {
      fetchMyListings();
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const result = await blink.db.userProfiles.list<{ isAdmin: string }>({
        where: { userId: user.id },
        limit: 1,
        select: ['isAdmin'],
      });

      if (result.length > 0) {
        setIsAdmin(result[0].isAdmin === '1');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchCrops = async () => {
    try {
      const data = await blink.db.crops.list<Crop>({
        orderBy: { name: 'asc' },
        limit: 50
      });
      setCrops(data);
    } catch (error) {
      console.error('Error fetching crops:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      const data = await blink.db.cropListings.list<CropListing>({
        where: { status: 'approved' },
        orderBy: { createdAt: 'desc' },
        limit: 50
      });
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;
    try {
      const data = await blink.db.cropListings.list<CropListing>({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      setMyListings(data);
      
      // Fetch offers for each listing
      for (const listing of data) {
        fetchOffersForListing(listing.id);
      }
    } catch (error) {
      console.error('Error fetching my listings:', error);
    }
  };

  const fetchOffersForListing = async (listingId: string) => {
    try {
      const offers = await blink.db.cropOffers.list<CropOffer>({
        where: { listingId },
        orderBy: { createdAt: 'desc' }
      });
      setMyListingOffers(prev => ({
        ...prev,
        [listingId]: offers
      }));
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to create a listing');
      return;
    }

    const totalPrice = parseFloat(formData.quantity) * parseFloat(formData.pricePerUnit);

    const result = await handleDatabaseCreate(
      () => blink.db.cropListings.create({
        userId: user.id,
        cropName: formData.cropName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        totalPrice,
        description: formData.description,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone,
        sellerLocation: formData.sellerLocation,
        imageUrl: listingImageUrl || undefined,
        status: 'pending' // Requires admin approval before appearing in marketplace
      }),
      'A similar listing already exists'
    );

    if (result.success) {
      toast.success('Listing submitted successfully! It will appear in the marketplace once approved by admin.');
      setIsCreateDialogOpen(false);
      setFormData({
        cropName: '',
        quantity: '',
        unit: 'kg',
        pricePerUnit: '',
        description: '',
        sellerName: '',
        sellerPhone: '',
        sellerLocation: ''
      });
      // Reset listing image state
      setListingImageFile(null);
      setListingImagePreview('');
      setListingImageUrl('');
      fetchListings();
      if (user) fetchMyListings();
    } else {
      const errorMessage = getUserFriendlyErrorMessage(result.error);
      toast.error(errorMessage);
    }
  };

  const handleBuyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to make an offer');
      return;
    }

    if (!selectedListing) return;

    const result = await handleDatabaseCreate(
      () => blink.db.cropOffers.create({
        listingId: selectedListing.id,
        buyerId: user.id,
        buyerName: buyerData.buyerName,
        buyerPhone: buyerData.buyerPhone,
        buyerAddress: buyerData.buyerAddress,
        offeredPrice: parseFloat(buyerData.offeredPrice),
        quantity: parseFloat(buyerData.quantity),
        message: buyerData.message,
        status: 'pending'
      }),
      'You have already made an offer on this listing'
    );

    if (result.success) {
      // Send offer details to seller via WhatsApp
      const totalOfferValue = parseFloat(buyerData.quantity) * parseFloat(buyerData.offeredPrice);
      
      // Open WhatsApp chat with pre-filled offer details
      openWhatsAppChat({
        phoneNumber: selectedListing.sellerPhone,
        cropName: selectedListing.cropName,
        quantity: parseFloat(buyerData.quantity),
        unit: selectedListing.unit,
        pricePerUnit: parseFloat(buyerData.offeredPrice),
        price: totalOfferValue,
        buyerName: buyerData.buyerName,
        buyerPhone: buyerData.buyerPhone,
        customMessage: buyerData.message || undefined
      });

      toast.success('Your offer has been sent to the seller via WhatsApp!');
      setIsBuyDialogOpen(false);
      setBuyerData({
        buyerName: '',
        buyerPhone: '',
        buyerAddress: '',
        offeredPrice: '',
        quantity: '',
        message: ''
      });
    } else {
      const errorMessage = getUserFriendlyErrorMessage(result.error);
      toast.error(errorMessage);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!extension || !validExtensions.includes(extension)) {
        toast.error(`Invalid image format. Please use: ${validExtensions.join(', ')}`);
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToStorage = async () => {
    if (!imageFile) {
      toast.error('No image selected');
      return;
    }

    setUploadingImage(true);
    try {
      const extension = imageFile.name.split('.').pop()?.toLowerCase();
      const { publicUrl } = await blink.storage.upload(
        imageFile,
        `crops/${Date.now()}.${extension}`
      );
      
      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler for listing image selection
  const handleListingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!extension || !validExtensions.includes(extension)) {
        toast.error(`Invalid image format. Please use: ${validExtensions.join(', ')}`);
        return;
      }

      setListingImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setListingImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload listing image to Blink Storage
  const uploadListingImageToStorage = async () => {
    if (!listingImageFile) {
      toast.error('No image selected');
      return;
    }

    setUploadingListingImage(true);
    try {
      const extension = listingImageFile.name.split('.').pop()?.toLowerCase();
      const { publicUrl } = await blink.storage.upload(
        listingImageFile,
        `listings/${Date.now()}.${extension}`
      );
      
      setListingImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingListingImage(false);
    }
  };

  // Remove listing image
  const removeListingImage = () => {
    setListingImageFile(null);
    setListingImagePreview('');
    setListingImageUrl('');
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
  };

  const handleEditCrop = (crop: Crop) => {
    setSelectedCrop(crop);
    setImageUrl(crop.imageUrl || '');
    setCropFormData({
      name: crop.name || '',
      scientificName: crop.scientificName || '',
      description: crop.description || '',
      optimalN: crop.optimalN?.toString() || '',
      optimalP: crop.optimalP?.toString() || '',
      optimalK: crop.optimalK?.toString() || '',
      optimalTemp: crop.optimalTemp?.toString() || '',
      optimalHumidity: crop.optimalHumidity?.toString() || '',
      optimalRainfall: crop.optimalRainfall?.toString() || '',
      optimalPh: crop.optimalPh?.toString() || '',
      suitableSoilTypes: crop.suitableSoilTypes || '',
      season: crop.season || '',
      marketPrice: crop.marketPrice?.toString() || '',
      cultivationTips: crop.cultivationTips || ''
    });
    setIsEditCropDialogOpen(true);
  };

  const handleSubmitCropUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCrop) return;
    
    setSubmittingCrop(true);
    try {
      const cropData = {
        name: cropFormData.name,
        scientificName: cropFormData.scientificName,
        description: cropFormData.description,
        optimalN: parseFloat(cropFormData.optimalN) || undefined,
        optimalP: parseFloat(cropFormData.optimalP) || undefined,
        optimalK: parseFloat(cropFormData.optimalK) || undefined,
        optimalTemp: parseFloat(cropFormData.optimalTemp) || undefined,
        optimalHumidity: parseFloat(cropFormData.optimalHumidity) || undefined,
        optimalRainfall: parseFloat(cropFormData.optimalRainfall) || undefined,
        optimalPh: parseFloat(cropFormData.optimalPh) || undefined,
        suitableSoilTypes: cropFormData.suitableSoilTypes,
        season: cropFormData.season,
        marketPrice: parseFloat(cropFormData.marketPrice) || undefined,
        cultivationTips: cropFormData.cultivationTips,
        imageUrl: imageUrl || selectedCrop.imageUrl || undefined
      };

      await blink.db.crops.update(selectedCrop.id, cropData);
      toast.success('Crop information updated successfully!');
      setIsEditCropDialogOpen(false);
      resetCropForm();
      fetchCrops();
    } catch (error) {
      console.error('Error updating crop:', error);
      toast.error('Failed to update crop information');
    } finally {
      setSubmittingCrop(false);
    }
  };

  const resetCropForm = () => {
    setSelectedCrop(null);
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    setCropFormData({
      name: '',
      scientificName: '',
      description: '',
      optimalN: '',
      optimalP: '',
      optimalK: '',
      optimalTemp: '',
      optimalHumidity: '',
      optimalRainfall: '',
      optimalPh: '',
      suitableSoilTypes: '',
      season: '',
      marketPrice: '',
      cultivationTips: ''
    });
  };

  const filteredCrops = crops.filter(crop =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredListings = listings.filter(listing =>
    listing.cropName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Crop Marketplace</h1>
          <p className="text-muted-foreground mb-6">
            Buy and sell crops directly with farmers - Quick commerce for agriculture
          </p>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Store className="w-5 h-5" />
                  Sell Your Crops
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Crop Listing</DialogTitle>
                  <DialogDescription>
                    List your crops for sale. Your listing will be reviewed by admin before appearing in the marketplace.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateListing} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Crop Name *</Label>
                      <Select value={formData.cropName} onValueChange={(value) => setFormData({...formData, cropName: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select crop" />
                        </SelectTrigger>
                        <SelectContent>
                          {crops.map(crop => (
                            <SelectItem key={crop.id} value={crop.name}>{crop.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Your Name *</Label>
                      <Input
                        required
                        value={formData.sellerName}
                        onChange={(e) => setFormData({...formData, sellerName: e.target.value})}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div>
                      <Label>Unit *</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="quintal">Quintals</SelectItem>
                          <SelectItem value="ton">Tons</SelectItem>
                          <SelectItem value="bag">Bags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Price Per Unit (₹) *</Label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={formData.pricePerUnit}
                        onChange={(e) => setFormData({...formData, pricePerUnit: e.target.value})}
                        placeholder="e.g., 50"
                      />
                    </div>
                    <div>
                      <Label>Contact Phone *</Label>
                      <Input
                        required
                        type="tel"
                        value={formData.sellerPhone}
                        onChange={(e) => setFormData({...formData, sellerPhone: e.target.value})}
                        placeholder="Your phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Location *</Label>
                      <Input
                        required
                        value={formData.sellerLocation}
                        onChange={(e) => setFormData({...formData, sellerLocation: e.target.value})}
                        placeholder="Village, District, State"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Quality, variety, harvest date, etc."
                        rows={3}
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div className="md:col-span-2">
                      <Label htmlFor="listingImage">Crop Image *</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 mt-2">
                        {listingImagePreview ? (
                          <div className="relative space-y-2">
                            <img
                              src={listingImagePreview}
                              alt="Crop preview"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={removeListingImage}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Remove Image
                              </Button>
                              {!listingImageUrl && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="flex-1"
                                  onClick={uploadListingImageToStorage}
                                  disabled={uploadingListingImage}
                                >
                                  {uploadingListingImage ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-1" />
                                      Upload Image
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            {listingImageUrl && (
                              <div className="text-sm text-green-600 bg-green-50 p-2 rounded flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Image uploaded successfully! You can now submit the listing.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Input
                              id="listingImage"
                              type="file"
                              accept="image/*"
                              onChange={handleListingImageSelect}
                              className="hidden"
                            />
                            <label
                              htmlFor="listingImage"
                              className="cursor-pointer block"
                            >
                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-medium">Click to select or drag and drop</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WebP (max 5MB)</p>
                            </label>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        📸 Please upload a clear photo of your crop before creating the listing
                      </p>
                    </div>
                  </div>
                  {formData.quantity && formData.pricePerUnit && (
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <p className="text-sm font-semibold">Total Value: ₹{(parseFloat(formData.quantity) * parseFloat(formData.pricePerUnit)).toFixed(2)}</p>
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!listingImageUrl}
                  >
                    {listingImageUrl ? 'Create Listing' : 'Upload Image First'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2" 
              onClick={() => document.getElementById('marketplace-tab')?.click()}
            >
              <ShoppingCart className="w-5 h-5" />
              Browse & Buy Crops
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search crops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="marketplace" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="marketplace" id="marketplace-tab">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="mylistings">
              <Store className="w-4 h-4 mr-2" />
              My Listings {myListings.length > 0 && `(${myListings.length})`}
            </TabsTrigger>
            <TabsTrigger value="info">
              <TrendingUp className="w-4 h-4 mr-2" />
              Crop Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.length > 0 ? (
                filteredListings.map((listing) => (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                    {/* Crop Image */}
                    {listing.imageUrl ? (
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        <img 
                          src={listing.imageUrl} 
                          alt={listing.cropName}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3E' + listing.cropName.charAt(0) + '%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center">
                        <div className="text-center">
                          <Package className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-2" />
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">{listing.cropName}</p>
                        </div>
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{listing.cropName}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {listing.sellerLocation}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          <IndianRupee className="w-3 h-3" />
                          {listing.pricePerUnit}/{listing.unit}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-semibold flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {listing.quantity} {listing.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Value:</span>
                          <span className="font-bold text-primary">₹{listing.totalPrice.toFixed(2)}</span>
                        </div>
                        {listing.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                        )}
                        <div className="pt-2 space-y-2">
                          <div className="flex gap-2">
                            <Button 
                              variant={isInCart(listing.id) ? "secondary" : "default"}
                              className="flex-1 gap-2"
                              onClick={() => {
                                addToCart({
                                  listingId: listing.id,
                                  cropName: listing.cropName,
                                  sellerName: listing.sellerName,
                                  sellerPhone: listing.sellerPhone,
                                  sellerLocation: listing.sellerLocation,
                                  sellerId: listing.userId,
                                  quantity: 1,
                                  maxQuantity: listing.quantity,
                                  unit: listing.unit,
                                  pricePerUnit: listing.pricePerUnit,
                                  imageUrl: listing.imageUrl
                                });
                              }}
                              disabled={isInCart(listing.id)}
                            >
                              <ShoppingCart className="w-4 h-4" />
                              {isInCart(listing.id) ? 'In Cart' : 'Add to Cart'}
                            </Button>
                            <Button 
                              className="flex-1 gap-2"
                              variant="outline"
                              onClick={() => {
                                if (!isInCart(listing.id)) {
                                  addToCart({
                                    listingId: listing.id,
                                    cropName: listing.cropName,
                                    sellerName: listing.sellerName,
                                    sellerPhone: listing.sellerPhone,
                                    sellerLocation: listing.sellerLocation,
                                    sellerId: listing.userId,
                                    quantity: 1,
                                    maxQuantity: listing.quantity,
                                    unit: listing.unit,
                                    pricePerUnit: listing.pricePerUnit,
                                    imageUrl: listing.imageUrl
                                  });
                                }
                                navigate('/cart');
                              }}
                            >
                              Buy Now
                            </Button>
                          </div>

                          <Dialog open={isBuyDialogOpen && selectedListing?.id === listing.id} 
                                  onOpenChange={(open) => {
                                    setIsBuyDialogOpen(open);
                                    if (open) setSelectedListing(listing);
                                  }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" className="w-full gap-2" size="sm">
                                <Package className="w-4 h-4" />
                                Make Custom Offer
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Buy {listing.cropName}</DialogTitle>
                                <DialogDescription>
                                  Submit your offer to the seller
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleBuyRequest} className="space-y-4">
                                <div>
                                  <Label>Your Name *</Label>
                                  <Input
                                    required
                                    value={buyerData.buyerName}
                                    onChange={(e) => setBuyerData({...buyerData, buyerName: e.target.value})}
                                    placeholder="Your full name"
                                  />
                                </div>
                                <div>
                                  <Label>Contact Phone *</Label>
                                  <Input
                                    required
                                    type="tel"
                                    value={buyerData.buyerPhone}
                                    onChange={(e) => setBuyerData({...buyerData, buyerPhone: e.target.value})}
                                    placeholder="Your phone number"
                                  />
                                </div>
                                <div>
                                  <Label>Delivery Address *</Label>
                                  <Input
                                    required
                                    value={buyerData.buyerAddress}
                                    onChange={(e) => setBuyerData({...buyerData, buyerAddress: e.target.value})}
                                    placeholder="Village, District, State"
                                  />
                                </div>
                                <div>
                                  <Label>Quantity ({listing.unit}) *</Label>
                                  <Input
                                    required
                                    type="number"
                                    step="0.01"
                                    max={listing.quantity}
                                    value={buyerData.quantity}
                                    onChange={(e) => setBuyerData({...buyerData, quantity: e.target.value})}
                                    placeholder={`Max: ${listing.quantity}`}
                                  />
                                </div>
                                <div>
                                  <Label>Your Offer (₹/{listing.unit}) *</Label>
                                  <Input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={buyerData.offeredPrice}
                                    onChange={(e) => setBuyerData({...buyerData, offeredPrice: e.target.value})}
                                    placeholder={`Listed at ₹${listing.pricePerUnit}`}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Listed price: ₹{listing.pricePerUnit}/{listing.unit}
                                  </p>
                                </div>
                                <div>
                                  <Label>Message (Optional)</Label>
                                  <Textarea
                                    value={buyerData.message}
                                    onChange={(e) => setBuyerData({...buyerData, message: e.target.value})}
                                    placeholder="Any specific requirements or questions"
                                    rows={3}
                                  />
                                </div>
                                {buyerData.quantity && buyerData.offeredPrice && (
                                  <div className="p-3 bg-primary/5 rounded-lg">
                                    <p className="text-sm font-semibold">
                                      Total Offer: ₹{(parseFloat(buyerData.quantity) * parseFloat(buyerData.offeredPrice)).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                                <Button type="submit" className="w-full">Submit Offer</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>Seller: {listing.sellerName}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-16">
                  <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                  <p className="text-muted-foreground mb-4">Be the first to list your crops for sale!</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Listing
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mylistings" className="mt-6">
            {!user ? (
              <div className="text-center py-16">
                <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in to view your listings</h3>
                <p className="text-muted-foreground mb-4">Create and manage your crop listings</p>
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-16">
                <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">You haven't created any listings yet</h3>
                <p className="text-muted-foreground mb-4">Start selling your crops on the marketplace</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Listing
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {myListings.some(l => l.status === 'pending') && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Pending Approval</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-400">
                          Your pending listings are under review by our admin team. Once approved, they will be visible to all buyers in the marketplace. This usually takes 24-48 hours.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {myListings.map((listing) => {
                  const offers = myListingOffers[listing.id] || [];
                  const pendingOffers = offers.filter(o => o.status === 'pending').length;
                  
                  return (
                    <Card key={listing.id} className="overflow-hidden">
                      <CardHeader className="bg-primary/5">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">{listing.cropName}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {listing.sellerLocation}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={listing.status === 'approved' ? 'default' : listing.status === 'pending' ? 'secondary' : 'destructive'} className="flex items-center gap-1">
                              {listing.status === 'pending' && <Clock className="w-3 h-3" />}
                              {listing.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                              {listing.status === 'rejected' && <XCircle className="w-3 h-3" />}
                              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                            </Badge>
                            {listing.status === 'pending' && (
                              <span className="text-xs text-muted-foreground text-right max-w-[150px]">
                                Awaiting admin approval
                              </span>
                            )}
                            {listing.status === 'approved' && pendingOffers > 0 && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                {pendingOffers} New Offer{pendingOffers > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Quantity</p>
                            <p className="font-semibold">{listing.quantity} {listing.unit}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Price per {listing.unit}</p>
                            <p className="font-semibold">₹{listing.pricePerUnit}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Value</p>
                            <p className="font-bold text-primary">₹{listing.totalPrice}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Offers</p>
                            <p className="font-semibold">{offers.length}</p>
                          </div>
                        </div>

                        {listing.description && (
                          <p className="text-sm text-muted-foreground mb-4 pb-4 border-b">{listing.description}</p>
                        )}

                        {/* Offers Section */}
                        {offers.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Offers Received ({offers.length})
                            </h4>
                            <div className="space-y-2">
                              {offers.map((offer) => (
                                <div key={offer.id} className="border rounded-lg p-4 bg-card">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <p className="font-semibold">{offer.buyerName}</p>
                                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {offer.buyerPhone}
                                      </p>
                                      {offer.buyerAddress && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3" />
                                          {offer.buyerAddress}
                                        </p>
                                      )}
                                    </div>
                                    <Badge 
                                      variant={
                                        offer.status === 'accepted' ? 'default' : 
                                        offer.status === 'rejected' ? 'destructive' : 
                                        'secondary'
                                      }
                                      className="flex items-center gap-1"
                                    >
                                      {offer.status === 'accepted' && <CheckCircle className="w-3 h-3" />}
                                      {offer.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                      {offer.status === 'pending' && <Clock className="w-3 h-3" />}
                                      {offer.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Quantity</p>
                                      <p className="font-semibold">{offer.quantity} {listing.unit}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Offered Price</p>
                                      <p className="font-semibold">₹{offer.offeredPrice}/{listing.unit}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">Total Value</p>
                                      <p className="font-bold text-primary text-lg">₹{(offer.quantity * offer.offeredPrice).toFixed(2)}</p>
                                    </div>
                                  </div>

                                  {offer.message && (
                                    <div className="mb-3">
                                      <p className="text-xs text-muted-foreground mb-1">Message</p>
                                      <p className="text-sm bg-muted/50 p-2 rounded">{offer.message}</p>
                                    </div>
                                  )}

                                  {offer.status === 'pending' && (
                                    <div className="flex gap-2 pt-2">
                                      <Button 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={async () => {
                                          try {
                                            await blink.db.cropOffers.update(offer.id, { status: 'accepted' });
                                            
                                            const buyerUser = await blink.db.users.get<any>(offer.buyerId);
                                            
                                            if (buyerUser) {
                                              const buyerEmail = buyerUser.email;
                                              const buyerDisplayName = buyerUser.displayName || buyerUser.display_name || offer.buyerName;
                                              
                                              try {
                                                await blink.notifications.email({
                                                  to: buyerEmail,
                                                  subject: `Your offer for ${listing.cropName} has been accepted!`,
                                                  html: `
                                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                                      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                                                        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Offer Accepted!</h1>
                                                      </div>
                                                      
                                                      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                                        <h2 style="color: #1f2937; margin-top: 0;">Hello ${buyerDisplayName},</h2>
                                                        
                                                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                                                          Great news! Your offer for <strong>${listing.cropName}</strong> has been accepted by the seller.
                                                        </p>
                                                        
                                                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                                          <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Order Details</h3>
                                                          <table style="width: 100%; border-collapse: collapse;">
                                                            <tr>
                                                              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Crop:</td>
                                                              <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${listing.cropName}</td>
                                                            </tr>
                                                            <tr>
                                                              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Quantity:</td>
                                                              <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${offer.quantity} ${listing.unit}</td>
                                                            </tr>
                                                            <tr>
                                                              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Price per ${listing.unit}:</td>
                                                              <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">₹${offer.offeredPrice}</td>
                                                            </tr>
                                                            <tr style="border-top: 2px solid #e5e7eb;">
                                                              <td style="padding: 12px 0; color: #1f2937; font-weight: 600; font-size: 18px;">Total Amount:</td>
                                                              <td style="padding: 12px 0; color: #10b981; font-weight: 700; font-size: 20px; text-align: right;">₹${(offer.quantity * offer.offeredPrice).toFixed(2)}</td>
                                                            </tr>
                                                          </table>
                                                        </div>
                                                        
                                                        <h3 style="color: #1f2937; margin-bottom: 10px;">Seller Contact Information</h3>
                                                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px;">
                                                          <p style="margin: 5px 0; color: #92400e;"><strong>Name:</strong> ${listing.sellerName}</p>
                                                          <p style="margin: 5px 0; color: #92400e;"><strong>Phone:</strong> ${listing.sellerPhone}</p>
                                                          <p style="margin: 5px 0; color: #92400e;"><strong>Location:</strong> ${listing.sellerLocation}</p>
                                                        </div>
                                                        
                                                        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                                          <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                                            <strong>Next Steps:</strong> Please contact the seller directly using the phone number above to arrange payment and delivery details.
                                                          </p>
                                                        </div>
                                                        
                                                        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                                          This is an automated notification from Smart Agriculture Support System.<br/>
                                                          If you have any questions, please contact our support team.
                                                        </p>
                                                      </div>
                                                    </div>
                                                  `
                                                });
                                                
                                                console.log(`✅ Email notification sent to buyer: ${buyerEmail}`);
                                              } catch (emailError) {
                                                console.error('Failed to send email notification:', emailError);
                                              }
                                            }
                                            
                                            toast.success('Offer accepted! Buyer has been notified via email.');
                                            fetchOffersForListing(listing.id);
                                          } catch (error) {
                                            console.error('Error accepting offer:', error);
                                            toast.error('Failed to accept offer');
                                          }
                                        }}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Accept
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        className="flex-1"
                                        onClick={async () => {
                                          try {
                                            await blink.db.cropOffers.update(offer.id, { status: 'rejected' });
                                            toast.success('Offer rejected');
                                            fetchOffersForListing(listing.id);
                                          } catch (error) {
                                            toast.error('Failed to reject offer');
                                          }
                                        }}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}

                                  <p className="text-xs text-muted-foreground mt-2">
                                    Received: {new Date(offer.createdAt).toLocaleDateString()} at {new Date(offer.createdAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No offers received yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Buyers will see your listing in the marketplace</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 w-full" />
                    <CardHeader>
                      <Skeleton className="h-6 w-2/3 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredCrops.length > 0 ? (
                filteredCrops.map((crop) => (
                  <Card 
                    key={crop.id} 
                    className="h-full hover:shadow-lg transition-shadow overflow-hidden relative group"
                  >
                    {/* Admin Edit Button */}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCrop(crop);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}

                    {crop.imageUrl ? (
                      <div 
                        className="relative h-48 w-full overflow-hidden bg-muted cursor-pointer"
                        onClick={() => {
                          setSelectedCrop(crop);
                          setIsCropDetailDialogOpen(true);
                        }}
                      >
                        <img 
                          src={crop.imageUrl} 
                          alt={crop.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3E' + crop.name.charAt(0) + '%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="h-48 w-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          setSelectedCrop(crop);
                          setIsCropDetailDialogOpen(true);
                        }}
                      >
                        <div className="text-center">
                          <Package className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-2" />
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">{crop.name}</p>
                        </div>
                      </div>
                    )}
                    
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCrop(crop);
                        setIsCropDetailDialogOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{crop.name}</CardTitle>
                          {crop.scientificName && (
                            <CardDescription className="italic text-xs mt-1">
                              {crop.scientificName}
                            </CardDescription>
                          )}
                        </div>
                        {crop.marketPrice && (
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            ₹{crop.marketPrice}/kg
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent 
                      className="space-y-3 cursor-pointer"
                      onClick={() => {
                        setSelectedCrop(crop);
                        setIsCropDetailDialogOpen(true);
                      }}
                    >
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {crop.description || 'No description available'}
                      </p>
                      
                      {/* Enhanced Info Badges */}
                      <div className="flex flex-wrap gap-2">
                        {crop.season && (
                          <Badge variant="outline" className="text-xs">
                            🌱 {crop.season}
                          </Badge>
                        )}
                        {crop.optimalTemp && (
                          <Badge variant="outline" className="text-xs">
                            🌡️ {crop.optimalTemp}°C
                          </Badge>
                        )}
                        {crop.optimalRainfall && (
                          <Badge variant="outline" className="text-xs">
                            💧 {crop.optimalRainfall}mm
                          </Badge>
                        )}
                        {crop.suitableSoilTypes && (
                          <Badge variant="outline" className="text-xs">
                            🌾 {crop.suitableSoilTypes.split(',')[0]}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No crops found</p>
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span>Marketing Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">1. Know Your Market</h3>
                  <p className="text-sm text-muted-foreground">
                    Research local market prices, demand patterns, and seasonal trends before selling.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2. Quality Matters</h3>
                  <p className="text-sm text-muted-foreground">
                    Maintain high quality standards. Clean, graded produce fetches better prices.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3. Direct Marketing</h3>
                  <p className="text-sm text-muted-foreground">
                    Consider farmer's markets, cooperatives, or direct-to-consumer sales for better margins.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">4. Storage and Timing</h3>
                  <p className="text-sm text-muted-foreground">
                    Proper storage can help you sell when prices are favorable rather than immediately after harvest.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Admin Edit Crop Dialog */}
        <Dialog open={isEditCropDialogOpen} onOpenChange={(open) => {
          setIsEditCropDialogOpen(open);
          if (!open) resetCropForm();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Crop Information</DialogTitle>
              <DialogDescription>
                Update detailed information about {selectedCrop?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitCropUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Crop Name *</Label>
                  <Input
                    id="edit-name"
                    value={cropFormData.name}
                    onChange={(e) => setCropFormData({ ...cropFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-scientificName">Scientific Name</Label>
                  <Input
                    id="edit-scientificName"
                    value={cropFormData.scientificName}
                    onChange={(e) => setCropFormData({ ...cropFormData, scientificName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  rows={3}
                  value={cropFormData.description}
                  onChange={(e) => setCropFormData({ ...cropFormData, description: e.target.value })}
                  placeholder="General description of the crop"
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="edit-cropImage">Crop Image</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {imagePreview ? (
                    <div className="relative space-y-2">
                      <img
                        src={imagePreview}
                        alt="Crop preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={removeImage}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove Image
                        </Button>
                        {!imageUrl && (
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1"
                            onClick={uploadImageToStorage}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-1" />
                                Upload Image
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {imageUrl && (
                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                          ✅ Image uploaded successfully
                        </div>
                      )}
                    </div>
                  ) : selectedCrop?.imageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={selectedCrop.imageUrl}
                        alt="Current crop image"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Input
                        id="edit-cropImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <Input
                        id="edit-cropImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-cropImage"
                        className="cursor-pointer block"
                      >
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to select or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WebP (max 5MB)</p>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalN">Optimal N</Label>
                  <Input
                    id="edit-optimalN"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalN}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalN: e.target.value })}
                    placeholder="Nitrogen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalP">Optimal P</Label>
                  <Input
                    id="edit-optimalP"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalP}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalP: e.target.value })}
                    placeholder="Phosphorus"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalK">Optimal K</Label>
                  <Input
                    id="edit-optimalK"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalK}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalK: e.target.value })}
                    placeholder="Potassium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalTemp">Temperature (°C)</Label>
                  <Input
                    id="edit-optimalTemp"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalTemp}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalTemp: e.target.value })}
                    placeholder="Optimal temperature"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalHumidity">Humidity (%)</Label>
                  <Input
                    id="edit-optimalHumidity"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalHumidity}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalHumidity: e.target.value })}
                    placeholder="Optimal humidity"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalRainfall">Rainfall (mm)</Label>
                  <Input
                    id="edit-optimalRainfall"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalRainfall}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalRainfall: e.target.value })}
                    placeholder="Annual rainfall"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-optimalPh">pH Value</Label>
                  <Input
                    id="edit-optimalPh"
                    type="number"
                    step="0.1"
                    value={cropFormData.optimalPh}
                    onChange={(e) => setCropFormData({ ...cropFormData, optimalPh: e.target.value })}
                    placeholder="Soil pH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-suitableSoilTypes">Soil Types</Label>
                  <Input
                    id="edit-suitableSoilTypes"
                    placeholder="e.g., Loamy, Sandy, Clay"
                    value={cropFormData.suitableSoilTypes}
                    onChange={(e) => setCropFormData({ ...cropFormData, suitableSoilTypes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-season">Season</Label>
                  <Input
                    id="edit-season"
                    placeholder="e.g., Kharif, Rabi, Zaid"
                    value={cropFormData.season}
                    onChange={(e) => setCropFormData({ ...cropFormData, season: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-marketPrice">Market Price (₹/kg)</Label>
                <Input
                  id="edit-marketPrice"
                  type="number"
                  step="0.01"
                  value={cropFormData.marketPrice}
                  onChange={(e) => setCropFormData({ ...cropFormData, marketPrice: e.target.value })}
                  placeholder="Current market price per kg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cultivationTips">Cultivation Tips</Label>
                <Textarea
                  id="edit-cultivationTips"
                  rows={4}
                  value={cropFormData.cultivationTips}
                  onChange={(e) => setCropFormData({ ...cropFormData, cultivationTips: e.target.value })}
                  placeholder="Detailed cultivation tips, best practices, and recommendations..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditCropDialogOpen(false)}
                  disabled={submittingCrop}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingCrop}>
                  {submittingCrop ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Crop Information'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Crop Detail Modal Dialog */}
        <Dialog open={isCropDetailDialogOpen} onOpenChange={setIsCropDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCrop?.name}</DialogTitle>
              {selectedCrop?.scientificName && (
                <DialogDescription className="italic text-sm">
                  {selectedCrop.scientificName}
                </DialogDescription>
              )}
            </DialogHeader>

            {selectedCrop && (
              <div className="space-y-6">
                {/* Image */}
                {selectedCrop.imageUrl && (
                  <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
                    <img 
                      src={selectedCrop.imageUrl} 
                      alt={selectedCrop.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Market Price */}
                {selectedCrop.marketPrice && (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Market Price</p>
                      <p className="text-2xl font-bold text-primary">₹{selectedCrop.marketPrice}/kg</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedCrop.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedCrop.description}</p>
                  </div>
                )}

                {/* Season and Soil Type */}
                {(selectedCrop.season || selectedCrop.suitableSoilTypes) && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Characteristics</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCrop.season && (
                        <Badge variant="outline" className="text-sm">
                          🌱 Season: {selectedCrop.season}
                        </Badge>
                      )}
                      {selectedCrop.suitableSoilTypes && (
                        <Badge variant="outline" className="text-sm">
                          🌾 Soil: {selectedCrop.suitableSoilTypes}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Optimal Conditions */}
                {(selectedCrop.optimalTemp || selectedCrop.optimalRainfall || selectedCrop.optimalPh || selectedCrop.optimalHumidity) && (
                  <div>
                    <h3 className="font-semibold mb-3">Optimal Growing Conditions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCrop.optimalTemp && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-xs text-muted-foreground">Temperature</p>
                          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{selectedCrop.optimalTemp}°C</p>
                        </div>
                      )}
                      {selectedCrop.optimalRainfall && (
                        <div className="p-3 bg-cyan-50 dark:bg-cyan-950 rounded-lg">
                          <p className="text-xs text-muted-foreground">Rainfall</p>
                          <p className="text-lg font-semibold text-cyan-700 dark:text-cyan-300">{selectedCrop.optimalRainfall}mm</p>
                        </div>
                      )}
                      {selectedCrop.optimalPh && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <p className="text-xs text-muted-foreground">pH</p>
                          <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">{selectedCrop.optimalPh}</p>
                        </div>
                      )}
                      {selectedCrop.optimalHumidity && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-xs text-muted-foreground">Humidity</p>
                          <p className="text-lg font-semibold text-green-700 dark:text-green-300">{selectedCrop.optimalHumidity}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* NPK Requirements */}
                {(selectedCrop.optimalN || selectedCrop.optimalP || selectedCrop.optimalK) && (
                  <div>
                    <h3 className="font-semibold mb-3">NPK Requirements</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedCrop.optimalN && (
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">N</div>
                          <p className="text-sm text-muted-foreground">Nitrogen</p>
                          <p className="font-semibold">{selectedCrop.optimalN}</p>
                        </div>
                      )}
                      {selectedCrop.optimalP && (
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mb-1">P</div>
                          <p className="text-sm text-muted-foreground">Phosphorus</p>
                          <p className="font-semibold">{selectedCrop.optimalP}</p>
                        </div>
                      )}
                      {selectedCrop.optimalK && (
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">K</div>
                          <p className="text-sm text-muted-foreground">Potassium</p>
                          <p className="font-semibold">{selectedCrop.optimalK}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cultivation Tips */}
                {selectedCrop.cultivationTips && (
                  <div>
                    <h3 className="font-semibold mb-2">Cultivation Tips</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedCrop.cultivationTips}
                    </p>
                  </div>
                )}

                {/* Health Benefits & Uses */}
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-green-900 dark:text-green-300">💪 Health Benefits</h3>
                  <ul className="text-sm text-green-800 dark:text-green-400 space-y-1 list-disc list-inside">
                    {selectedCrop.name === 'Rice' && (
                      <>
                        <li>Rich in carbohydrates and energy</li>
                        <li>Contains essential minerals like manganese and magnesium</li>
                        <li>Supports digestion and gut health</li>
                        <li>Gluten-free staple food</li>
                      </>
                    )}
                    {selectedCrop.name === 'Wheat' && (
                      <>
                        <li>High in protein and fiber</li>
                        <li>Rich in B vitamins and minerals</li>
                        <li>Supports heart health and digestion</li>
                        <li>Good source of antioxidants</li>
                      </>
                    )}
                    {selectedCrop.name === 'Tomato' && (
                      <>
                        <li>Rich in lycopene - powerful antioxidant</li>
                        <li>High in vitamin C for immune system</li>
                        <li>Contains potassium for heart health</li>
                        <li>Low in calories, ideal for weight management</li>
                      </>
                    )}
                    {selectedCrop.name === 'Cotton' && (
                      <>
                        <li>Raw material for sustainable textiles</li>
                        <li>Natural, biodegradable fiber</li>
                        <li>Breathable and comfortable for clothing</li>
                        <li>Used in medical and household textiles</li>
                      </>
                    )}
                    {selectedCrop.name === 'Corn' && (
                      <>
                        <li>Good source of dietary fiber</li>
                        <li>Contains lutein for eye health</li>
                        <li>Rich in antioxidants</li>
                        <li>Supports healthy cholesterol levels</li>
                      </>
                    )}
                    {selectedCrop.name === 'Sugarcane' && (
                      <>
                        <li>Natural source of sucrose and energy</li>
                        <li>Contains minerals like calcium and magnesium</li>
                        <li>Used to produce various sweeteners</li>
                        <li>Renewable energy source (bagasse)</li>
                      </>
                    )}
                    {!['Rice', 'Wheat', 'Tomato', 'Cotton', 'Corn', 'Sugarcane'].includes(selectedCrop.name) && (
                      <li>Click "Learn More" to explore detailed information about this crop's nutritional and economic benefits</li>
                    )}
                  </ul>
                </div>

                {/* Market Information */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-300">📊 Market Information</h3>
                  <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                    {selectedCrop.marketPrice && (
                      <div className="flex justify-between">
                        <span>Current Market Price:</span>
                        <span className="font-semibold">₹{selectedCrop.marketPrice}/kg</span>
                      </div>
                    )}
                    {selectedCrop.season && (
                      <div className="flex justify-between">
                        <span>Best Season:</span>
                        <span className="font-semibold">{selectedCrop.season}</span>
                      </div>
                    )}
                    {selectedCrop.optimalTemp && (
                      <div className="flex justify-between">
                        <span>Ideal Temperature:</span>
                        <span className="font-semibold">{selectedCrop.optimalTemp}°C</span>
                      </div>
                    )}
                    {selectedCrop.optimalRainfall && (
                      <div className="flex justify-between">
                        <span>Required Rainfall:</span>
                        <span className="font-semibold">{selectedCrop.optimalRainfall}mm</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsCropDetailDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
