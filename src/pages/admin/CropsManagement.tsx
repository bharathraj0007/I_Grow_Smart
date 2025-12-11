import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Upload, X } from 'lucide-react';
import type { Crop } from '@/types';

export default function CropsManagement() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
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
    marketPrice: ''
  });

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      const data = await blink.db.crops.list<Crop>({
        orderBy: { name: 'asc' },
        limit: 1000  // Increased limit to fetch all crops
      });
      console.log(`✓ Fetched ${data.length} crops`);
      setCrops(data);
    } catch (error) {
      console.error('Error fetching crops:', error);
      toast.error('Failed to load crops');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Validate image extension
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
      console.log('Uploading crop image...', { name: imageFile.name, size: imageFile.size });
      
      const extension = imageFile.name.split('.').pop()?.toLowerCase();
      const { publicUrl } = await blink.storage.upload(
        imageFile,
        `crops/${Date.now()}.${extension}`
      );
      
      console.log('✅ Crop image uploaded successfully:', publicUrl);
      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const cropData = {
        name: formData.name,
        scientificName: formData.scientificName,
        description: formData.description,
        optimalN: parseFloat(formData.optimalN) || undefined,
        optimalP: parseFloat(formData.optimalP) || undefined,
        optimalK: parseFloat(formData.optimalK) || undefined,
        optimalTemp: parseFloat(formData.optimalTemp) || undefined,
        optimalHumidity: parseFloat(formData.optimalHumidity) || undefined,
        optimalRainfall: parseFloat(formData.optimalRainfall) || undefined,
        optimalPh: parseFloat(formData.optimalPh) || undefined,
        suitableSoilTypes: formData.suitableSoilTypes,
        season: formData.season,
        marketPrice: parseFloat(formData.marketPrice) || undefined,
        imageUrl: imageUrl || editingCrop?.imageUrl || undefined
      };

      if (editingCrop) {
        await blink.db.crops.update(editingCrop.id, cropData);
        toast.success('Crop updated successfully');
      } else {
        await blink.db.crops.create(cropData);
        toast.success('Crop added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchCrops();
    } catch (error) {
      console.error('Error saving crop:', error);
      toast.error('Failed to save crop');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (crop: Crop) => {
    setEditingCrop(crop);
    setImageUrl(crop.imageUrl || '');
    setFormData({
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
      marketPrice: crop.marketPrice?.toString() || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this crop?')) return;

    try {
      await blink.db.crops.delete(id);
      toast.success('Crop deleted successfully');
      fetchCrops();
    } catch (error) {
      console.error('Error deleting crop:', error);
      toast.error('Failed to delete crop');
    }
  };

  const resetForm = () => {
    setEditingCrop(null);
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    setFormData({
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
      marketPrice: ''
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Crops Management</h1>
          <p className="text-muted-foreground">Manage crop information and optimal conditions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Crop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCrop ? 'Edit Crop' : 'Add New Crop'}</DialogTitle>
              <DialogDescription>
                {editingCrop ? 'Update the crop details below.' : 'Fill in the details to add a new crop to the database.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Crop Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scientificName">Scientific Name</Label>
                  <Input
                    id="scientificName"
                    value={formData.scientificName}
                    onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="cropImage">Crop Image</Label>
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
                  ) : (
                    <div className="text-center">
                      <Input
                        id="cropImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="cropImage"
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
                  <Label htmlFor="optimalN">Optimal N</Label>
                  <Input
                    id="optimalN"
                    type="number"
                    step="0.1"
                    value={formData.optimalN}
                    onChange={(e) => setFormData({ ...formData, optimalN: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimalP">Optimal P</Label>
                  <Input
                    id="optimalP"
                    type="number"
                    step="0.1"
                    value={formData.optimalP}
                    onChange={(e) => setFormData({ ...formData, optimalP: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimalK">Optimal K</Label>
                  <Input
                    id="optimalK"
                    type="number"
                    step="0.1"
                    value={formData.optimalK}
                    onChange={(e) => setFormData({ ...formData, optimalK: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="optimalTemp">Temperature (°C)</Label>
                  <Input
                    id="optimalTemp"
                    type="number"
                    step="0.1"
                    value={formData.optimalTemp}
                    onChange={(e) => setFormData({ ...formData, optimalTemp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimalHumidity">Humidity (%)</Label>
                  <Input
                    id="optimalHumidity"
                    type="number"
                    step="0.1"
                    value={formData.optimalHumidity}
                    onChange={(e) => setFormData({ ...formData, optimalHumidity: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="optimalRainfall">Rainfall (mm)</Label>
                  <Input
                    id="optimalRainfall"
                    type="number"
                    step="0.1"
                    value={formData.optimalRainfall}
                    onChange={(e) => setFormData({ ...formData, optimalRainfall: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optimalPh">pH Value</Label>
                  <Input
                    id="optimalPh"
                    type="number"
                    step="0.1"
                    value={formData.optimalPh}
                    onChange={(e) => setFormData({ ...formData, optimalPh: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suitableSoilTypes">Soil Types</Label>
                  <Input
                    id="suitableSoilTypes"
                    placeholder="e.g., Loamy, Sandy"
                    value={formData.suitableSoilTypes}
                    onChange={(e) => setFormData({ ...formData, suitableSoilTypes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season">Season</Label>
                  <Input
                    id="season"
                    placeholder="e.g., Kharif, Rabi"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketPrice">Market Price (₹/kg)</Label>
                <Input
                  id="marketPrice"
                  type="number"
                  step="0.01"
                  value={formData.marketPrice}
                  onChange={(e) => setFormData({ ...formData, marketPrice: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCrop ? 'Update' : 'Add'} Crop
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Crops ({crops.length})</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Scientific Name</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Price (₹/kg)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crops.map((crop) => (
                  <TableRow key={crop.id}>
                    <TableCell className="font-medium">{crop.name}</TableCell>
                    <TableCell className="italic">{crop.scientificName || '-'}</TableCell>
                    <TableCell>{crop.season || '-'}</TableCell>
                    <TableCell>{crop.marketPrice ? `₹${crop.marketPrice}` : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(crop)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(crop.id)}
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
