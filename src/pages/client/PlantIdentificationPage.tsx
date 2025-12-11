import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Leaf, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PlantIdentification {
  success: boolean;
  plantName: string;
  scientificName: string;
  family: string;
  genus: string;
  confidence: number;
  commonNames: string[];
  gbifId: string | null;
  plantnetUrl: string;
  plantImages: Array<{
    url: string;
    organ: string;
    author: string;
    license: string;
  }>;
}

export default function PlantIdentificationPage() {
  const { user } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlantIdentification | null>(null);
  const [organs, setOrgans] = useState<string[]>(['leaf']);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdentify = async () => {
    if (!image) {
      toast.error('Please upload a plant image');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting plant identification...');
      
      // Upload image to storage
      toast.loading('Uploading image...', { id: 'upload' });
      const { publicUrl } = await blink.storage.upload(
        image,
        `plant-identification/${Date.now()}.${image.name.split('.').pop()}`
      );
      console.log('Image uploaded to:', publicUrl);
      toast.dismiss('upload');

      // Call Plant ID edge function
      toast.loading('Identifying plant with Plant ID...', { id: 'identify' });
      console.log('Calling Plant ID edge function...');
      
      const response = await fetch('https://m80q4b8r--plantnet-detection.functions.blink.new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: publicUrl,
          organs: organs
        })
      });

      console.log('Response status:', response.status);
      toast.dismiss('identify');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Identification failed with status ${response.status}`;
        console.error('Plant ID error response:', errorData);
        throw new Error(errorMessage);
      }

      const identificationData = await response.json();
      console.log('Identification data received:', identificationData);

      if (!identificationData.success) {
        const errorMessage = identificationData.error || 'Identification failed';
        console.error('Identification failed:', errorMessage);
        throw new Error(errorMessage);
      }

      setResult(identificationData);
      toast.success(`Plant identified: ${identificationData.plantName}!`);
      console.log('Plant identification completed successfully');
    } catch (error) {
      console.error('Plant identification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to identify plant';
      toast.error(`Identification failed: ${errorMessage}. Please try again with a clearer image.`);
    } finally {
      setLoading(false);
    }
  };

  const organOptions = [
    { value: 'leaf', label: 'Leaf' },
    { value: 'flower', label: 'Flower' },
    { value: 'fruit', label: 'Fruit' },
    { value: 'bark', label: 'Bark' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Leaf className="w-10 h-10 text-green-600" />
            Plant Identification with Plant ID
          </h1>
          <p className="text-muted-foreground text-lg">
            Identify plants using AI-powered image recognition technology
          </p>
        </div>

        <Alert className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>🌿 Plant ID Recognition!</strong> Upload a clear photo of the plant (leaf, flower, fruit, or bark) 
            to identify the species using advanced AI-powered image recognition technology.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Plant Image</CardTitle>
              <CardDescription>Take a clear photo of the plant part for best results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Plant Part (Organ)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {organOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={organs.includes(option.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (organs.includes(option.value)) {
                          setOrgans(organs.filter(o => o !== option.value));
                        } else {
                          setOrgans([...organs, option.value]);
                        }
                      }}
                      disabled={loading}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the plant part(s) visible in your photo for better accuracy
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plantImage">Plant Image</Label>
                <Input
                  id="plantImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={loading}
                />
              </div>

              {imagePreview && (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              <Button
                onClick={handleIdentify}
                className="w-full"
                disabled={loading || !image || organs.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Identifying Plant...
                  </>
                ) : (
                  <>
                    <Leaf className="mr-2 h-4 w-4" />
                    Identify Plant
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground bg-accent/50 rounded-lg p-4">
                <p className="font-semibold mb-2">Tips for best results:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Take photos in good natural lighting</li>
                  <li>Focus clearly on the plant part</li>
                  <li>Include the entire leaf, flower, or fruit</li>
                  <li>Avoid blurry or dark images</li>
                  <li>Select the correct organ type</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {result && (
            <Card className="border-2 border-green-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Leaf className="w-6 h-6 text-green-600" />
                      {result.plantName}
                    </CardTitle>
                    <CardDescription className="text-base">
                      <em>{result.scientificName}</em>
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                        Confidence: {result.confidence}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Confidence Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-green-600"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Taxonomy */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Taxonomy Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-muted-foreground">Family</p>
                      <p className="text-foreground">{result.family}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Genus</p>
                      <p className="text-foreground">{result.genus}</p>
                    </div>
                  </div>
                </div>

                {/* Common Names */}
                {result.commonNames && result.commonNames.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Common Names</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.commonNames.slice(0, 5).map((name, i) => (
                          <Badge key={i} variant="secondary">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Plant Images */}
                {result.plantImages && result.plantImages.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Reference Images
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {result.plantImages.slice(0, 4).map((img, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={img.url}
                              alt={`Reference ${i + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              {img.organ}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Note:</strong> Plant ID specializes in plant identification. 
                    For disease detection and treatment recommendations, please use the Disease Detection page.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        {/* About Plant ID */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Plant ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Plant ID</strong> is an advanced plant identification system that accurately recognizes plants through photographs. 
              It uses state-of-the-art machine learning models trained on millions of plant images from botanical collections and research databases worldwide.
            </p>
            <p>
              The identification system analyzes visual features and patterns in plant structures to provide accurate species recognition. 
              It works best with clear, well-lit images of characteristic plant parts like leaves, flowers, fruits, or bark.
            </p>
            <div className="bg-accent/50 rounded-lg p-3 mt-3">
              <p className="font-semibold mb-1">Best Practices:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Take multiple photos of different parts if possible</li>
                <li>Ensure good lighting and focus</li>
                <li>Capture the entire organ (full leaf, complete flower, etc.)</li>
                <li>Select the correct organ type before identification</li>
                <li>Review multiple results if confidence is low</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
