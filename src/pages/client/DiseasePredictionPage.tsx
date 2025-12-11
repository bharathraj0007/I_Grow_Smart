import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertTriangle, FileText, Droplet, Bug, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { diseaseDatabase, findDiseaseByName, findDiseasesBySymptoms, type Disease } from '@/utils/diseaseDatabase';

export default function DiseasePredictionPage() {
  const { user } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    disease: string;
    confidence: number;
    symptoms: string;
    treatment: string;
  } | null>(null);
  const [detectedDisease, setDetectedDisease] = useState<Disease | null>(null);
  const [symptomInput, setSymptomInput] = useState<string>('');
  const [cropName, setCropName] = useState<string>('');
  const [symptomMatches, setSymptomMatches] = useState<Disease[]>([]);
  
  // API Key Detection states - Now secure (no exposed API key)
  const [apiImage, setApiImage] = useState<File | null>(null);
  const [apiImagePreview, setApiImagePreview] = useState<string>('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResult, setApiResult] = useState<Disease | null>(null);
  


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

  const handleAnalyze = async () => {
    if (!image) {
      toast.error('Please upload an image');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setLoading(true);
    setResult(null);
    setDetectedDisease(null);

    try {
      console.log('Starting Blink AI image analysis...');
      console.log('Image details:', { name: image.name, size: image.size, type: image.type });
      
      // Upload image to storage
      toast.loading('Uploading image to storage...', { id: 'upload' });
      const extension = image.name.split('.').pop()?.toLowerCase();
      
      // Validate image extension
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!extension || !validExtensions.includes(extension)) {
        throw new Error(`Invalid image format. Please use: ${validExtensions.join(', ')}`);
      }

      const { publicUrl } = await blink.storage.upload(
        image,
        `disease-detection/${Date.now()}.${extension}`
      );
      console.log('✅ Image uploaded successfully:', publicUrl);
      toast.success('Image uploaded!', { id: 'upload' });

      // Double-check URL has proper extension
      if (!publicUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        console.error('URL missing extension:', publicUrl);
        throw new Error('Uploaded image URL does not have a valid extension. Please try again.');
      }

      // Use Blink AI to analyze the image with structured object output
      toast.loading('🔬 Analyzing image with Blink AI...', { id: 'analyze' });
      console.log('🤖 Calling Blink AI generateObject for structured analysis...');
      
      const promptText = `You are an expert agricultural pathologist. Carefully analyze this plant image and identify any diseases or health issues.

Instructions:
1. Examine the plant carefully for signs of disease (spots, discoloration, wilting, mold, pests)
2. If you detect a disease, identify it by name
3. Provide confidence percentage (0-100)
4. List observable symptoms
5. Recommend appropriate treatment methods
6. If the plant appears healthy, set disease_name to "Healthy Plant"

${cropName ? `Plant/Crop Type: ${cropName}` : ''}

Image URL: ${publicUrl}`;

      const { object: analysis } = await blink.ai.generateObject({
        prompt: promptText,
        schema: {
          type: 'object',
          properties: {
            disease_name: {
              type: 'string',
              description: 'Name of the disease or "Healthy Plant" if no disease detected'
            },
            confidence_percentage: {
              type: 'number',
              description: 'Confidence level from 0-100'
            },
            symptoms: {
              type: 'string',
              description: 'Detailed description of visible symptoms'
            },
            treatment: {
              type: 'string',
              description: 'Specific treatment recommendations including fungicides, pesticides, or cultural practices'
            }
          },
          required: ['disease_name', 'confidence_percentage', 'symptoms', 'treatment']
        }
      });

      console.log('✅ Blink AI response received:', analysis);
      toast.dismiss('analyze');

      const resultData = {
        disease: analysis.disease_name || 'Unknown',
        confidence: analysis.confidence_percentage || 50,
        symptoms: analysis.symptoms || 'No symptoms identified',
        treatment: analysis.treatment || 'No treatment recommendations available'
      };

      console.log('📊 Final analysis result:', resultData);
      setResult(resultData);

      // Try to match with disease database for additional information
      const matchedDisease = findDiseaseByName(resultData.disease);
      if (matchedDisease) {
        console.log('✅ Matched disease from database:', matchedDisease.name);
        setDetectedDisease(matchedDisease);
      } else {
        console.log('ℹ️ No matching disease found in local database');
      }

      // Save to database
      console.log('💾 Saving analysis to database...');
      await blink.db.diseasePredictions.create({
        userId: user.id,
        cropName: cropName || 'Unknown',
        diseaseName: resultData.disease,
        confidence: resultData.confidence,
        symptoms: resultData.symptoms,
        treatment: resultData.treatment,
        imageUrl: publicUrl
      });

      toast.success('✅ Analysis complete!');
      console.log('✅ Image analysis completed successfully');
    } catch (error) {
      console.error('❌ Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      
      // Provide helpful error messages based on error type
      if (errorMessage.includes('extension') || errorMessage.includes('format')) {
        toast.error(`Image format error: ${errorMessage}`);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('storage')) {
        toast.error('Failed to upload image. Please try again.');
      } else {
        toast.error(`Analysis failed: ${errorMessage}\n\nTip: Try the PlantID API tab for more accurate results.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomDiagnosis = () => {
    if (!symptomInput.trim()) {
      toast.error('Please describe the symptoms');
      return;
    }

    setLoading(true);

    try {
      // Parse symptoms from input
      const symptoms = symptomInput
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Find matching diseases
      const matches = findDiseasesBySymptoms(symptoms);
      setSymptomMatches(matches);

      if (matches.length === 0) {
        toast.error('No matching diseases found. Try different symptoms or use image analysis.');
      } else {
        toast.success(`Found ${matches.length} potential disease(s)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        return;
      }
      setApiImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setApiImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };



  const handleApiDetection = async () => {
    if (!apiImage) {
      toast.error('Please upload a plant image');
      return;
    }

    setApiLoading(true);

    try {
      console.log('Starting API detection...');
      
      // Upload image to storage
      toast.loading('Uploading image...', { id: 'api-upload' });
      const { publicUrl } = await blink.storage.upload(
        apiImage,
        `api-disease-detection/${Date.now()}.${apiImage.name.split('.').pop()}`
      );
      console.log('Image uploaded to:', publicUrl);
      toast.dismiss('api-upload');

      // Call secure edge function (API key never exposed to client)
      toast.loading('Analyzing image with AI...', { id: 'api-analyze' });
      console.log('Calling edge function...');
      
      const response = await fetch('https://m80q4b8r--disease-detection-api.functions.blink.new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: publicUrl,
          cropName: cropName || 'Unknown'
        })
      });

      console.log('Response status:', response.status);
      toast.dismiss('api-analyze');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API request failed with status ${response.status}`;
        console.error('API error response:', errorData);
        throw new Error(errorMessage);
      }

      const detectionData = await response.json();
      console.log('Detection data received:', detectionData);

      if (!detectionData.success) {
        const errorMessage = detectionData.error || 'Detection failed';
        console.error('Detection failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Match with existing database or create new disease object
      let matchedDisease = findDiseaseByName(detectionData.disease);
      
      // Store PlantID specific data
      const plantIdConfidence = detectionData.confidence || 85;
      const plantIdUrl = detectionData.plantIdUrl;
      const similarImages = detectionData.similarImages || [];

      if (!matchedDisease) {
        console.log('Creating new disease object from API response');
        // Create disease object from API response
        matchedDisease = {
          id: `api_${Date.now()}`,
          name: detectionData.disease || 'Unknown Disease',
          scientificName: detectionData.scientificName || 'Unknown',
          severity: detectionData.severity || 'medium',
          symptoms: Array.isArray(detectionData.symptoms) ? detectionData.symptoms : [],
          affectedCrops: Array.isArray(detectionData.affectedCrops) ? detectionData.affectedCrops : ['Various crops'],
          favorableConditions: Array.isArray(detectionData.favorableConditions) ? detectionData.favorableConditions : [],
          spreadsBy: Array.isArray(detectionData.spreadsBy) ? detectionData.spreadsBy : [],
          chemicalTreatments: Array.isArray(detectionData.chemicalTreatments) ? detectionData.chemicalTreatments : [],
          organicTreatments: Array.isArray(detectionData.organicTreatments) ? detectionData.organicTreatments : [],
          culturalPractices: Array.isArray(detectionData.culturalPractices) ? detectionData.culturalPractices : [],
          preventiveMeasures: Array.isArray(detectionData.preventiveMeasures) ? detectionData.preventiveMeasures : [],
          // Add PlantID specific metadata
          plantIdConfidence,
          plantIdUrl,
          similarImages
        } as Disease & { plantIdConfidence?: number; plantIdUrl?: string; similarImages?: any[] };
      } else {
        console.log('Matched disease from database:', matchedDisease.name);
        // Attach PlantID metadata to existing disease
        (matchedDisease as any).plantIdConfidence = plantIdConfidence;
        (matchedDisease as any).plantIdUrl = plantIdUrl;
        (matchedDisease as any).similarImages = similarImages;
      }

      setApiResult(matchedDisease);

      // Save to database if user is logged in
      if (user) {
        console.log('Saving detection to database...');
        await blink.db.diseasePredictions.create({
          userId: user.id,
          cropName: cropName || 'Unknown',
          diseaseName: matchedDisease.name,
          confidence: plantIdConfidence,
          symptoms: matchedDisease.symptoms.join(', '),
          treatment: matchedDisease.chemicalTreatments.map(t => t.name).join(', '),
          imageUrl: publicUrl
        });
      }

      toast.success(`Disease detected: ${matchedDisease.name}!`);
      console.log('API detection completed successfully');
    } catch (error) {
      console.error('API detection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to detect disease';
      toast.error(`Detection failed: ${errorMessage}. Please try again or use Image Analysis.`);
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🔬 Dr.Plant - Disease Detection & Treatment</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered disease identification with expert pesticide recommendations
          </p>
        </div>

        {!user && (
          <Alert className="mb-6">
            <AlertDescription>
              Please sign in to use disease detection feature
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="image" className="mb-8">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-3">
            <TabsTrigger value="image">
              <Upload className="w-4 h-4 mr-2" />
              Image Analysis
            </TabsTrigger>
            <TabsTrigger value="symptoms">
              <FileText className="w-4 h-4 mr-2" />
              Symptom Checker
            </TabsTrigger>
            <TabsTrigger value="api">
              <ShieldAlert className="w-4 h-4 mr-2" />
              PlantID API
            </TabsTrigger>
          </TabsList>

          {/* Image Analysis Tab */}
          <TabsContent value="image" className="space-y-6 mt-6">
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong>🤖 Dr.Plant AI Analysis:</strong> This tab uses Blink's powerful AI vision model to analyze plant images 
                and identify diseases. Upload a clear image of your plant for instant AI-powered diagnosis with treatment recommendations.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Plant Image for Dr.Plant</CardTitle>
                  <CardDescription>Take a clear photo of affected leaves or plant parts for disease diagnosis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cropName">Crop Name (Optional)</Label>
                    <Input
                      id="cropName"
                      placeholder="e.g., Rice, Tomato, Wheat"
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Plant Image</Label>
                    <Input
                      id="image"
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
                    onClick={handleAnalyze}
                    className="w-full"
                    disabled={loading || !image || !user}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Analyze Image
                      </>
                    )}
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-2">Tips for best results:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Take photos in good lighting</li>
                      <li>Focus on affected areas</li>
                      <li>Include multiple angles if possible</li>
                      <li>Ensure image is clear and not blurry</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Results Section */}
              {result && (
                <Card className={`border-2 ${
                  result.disease === 'Healthy Plant' 
                    ? 'border-green-500' 
                    : 'border-orange-500'
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {result.disease !== 'Healthy Plant' && (
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      )}
                      <span>{result.disease}</span>
                    </CardTitle>
                    <CardDescription>
                      Confidence: {result.confidence}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                    </div>

                    {result.disease !== 'Healthy Plant' && (
                      <>
                        <div>
                          <h4 className="font-semibold mb-2">Symptoms</h4>
                          <p className="text-sm text-muted-foreground">
                            {result.symptoms}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Treatment</h4>
                          <p className="text-sm text-muted-foreground">
                            {result.treatment}
                          </p>
                        </div>

                        <Alert>
                          <AlertDescription className="text-xs">
                            <strong>Important:</strong> This is an AI-assisted diagnosis. 
                            For critical cases, please consult with a certified agricultural expert.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}

                    {result.disease === 'Healthy Plant' && (
                      <div className="text-center py-6">
                        <div className="text-6xl mb-4">🌱</div>
                        <p className="text-lg font-semibold text-green-600 mb-2">
                          Your plant looks healthy!
                        </p>
                        <p className="text-sm text-muted-foreground">
                          No signs of disease detected. Keep up the good work!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Symptom Checker Tab */}
          <TabsContent value="symptoms" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Describe Plant Symptoms</CardTitle>
                <CardDescription>
                  Describe what you observe on your plant to get possible disease matches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symptomCrop">Crop Name (Optional)</Label>
                  <Input
                    id="symptomCrop"
                    placeholder="e.g., Rice, Tomato, Wheat"
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="Describe symptoms (one per line or comma-separated):&#10;Example:&#10;- Yellowing leaves&#10;- Brown spots on leaves&#10;- Wilting of plant&#10;- White powder on leaves"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button
                  onClick={handleSymptomDiagnosis}
                  className="w-full"
                  disabled={loading || !symptomInput.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Find Diseases
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Common symptoms to look for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Leaf discoloration (yellow, brown, black spots)</li>
                    <li>Lesions or holes on leaves</li>
                    <li>Wilting or drooping</li>
                    <li>Powdery or fuzzy coatings</li>
                    <li>Stunted growth or deformed leaves</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Detection Tab */}
          <TabsContent value="api" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>API-Based Disease Detection</CardTitle>
                <CardDescription>
                  Use your own plant disease detection API key for advanced analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>🔒 Dr.Plant Secure API Detection!</strong> Our system uses a secure server-side API for plant disease detection. 
                    Your API key is protected and never exposed to the browser. Simply upload your plant image to get advanced AI-powered disease identification with comprehensive treatment recommendations.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="apiCropName">Crop Name (Optional)</Label>
                  <Input
                    id="apiCropName"
                    placeholder="e.g., Rice, Tomato, Wheat"
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    disabled={apiLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiImage">Plant Image</Label>
                  <Input
                    id="apiImage"
                    type="file"
                    accept="image/*"
                    onChange={handleApiImageChange}
                    disabled={apiLoading}
                  />
                </div>

                {apiImagePreview && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={apiImagePreview}
                      alt="API Preview"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                <Button
                  onClick={handleApiDetection}
                  className="w-full"
                  disabled={apiLoading || !apiImage}
                >
                  {apiLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Detecting Disease via API...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Detect Disease with API
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground bg-accent/50 rounded-lg p-4">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Benefits of API Detection:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>More accurate disease identification</li>
                    <li>Access to latest disease databases</li>
                    <li>Detailed treatment recommendations</li>
                    <li>Region-specific pesticide suggestions</li>
                    <li>Real-time updates from agricultural research</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>

        {/* Detailed Disease Information (shown for all methods) */}
        {(detectedDisease || symptomMatches.length > 0 || apiResult) && (
          <div className="space-y-6">
            {apiResult && (
              <div className="mb-4">
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>API Detection Complete!</strong> Disease identified using external API with comprehensive treatment recommendations.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {(apiResult ? [apiResult] : detectedDisease ? [detectedDisease] : symptomMatches).map((disease, index) => (
              <DiseaseDetailCard key={disease.id} disease={disease} rank={index + 1} isApiResult={!!apiResult && index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Component for displaying detailed disease information
function DiseaseDetailCard({ disease, rank, isApiResult }: { disease: Disease & { plantIdConfidence?: number; plantIdUrl?: string; similarImages?: any[] }; rank: number; isApiResult?: boolean }) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl flex items-center gap-3">
              {isApiResult && <Badge className="bg-green-600">PlantID API</Badge>}
              {!isApiResult && rank === 1 && <Badge variant="destructive">Most Likely</Badge>}
              {!isApiResult && rank > 1 && <Badge variant="outline">Match #{rank}</Badge>}
              <span>{disease.name}</span>
            </CardTitle>
            <CardDescription className="text-base">
              <em>{disease.scientificName}</em>
            </CardDescription>
            {disease.plantIdConfidence && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                  Confidence: {disease.plantIdConfidence}%
                </Badge>
                {disease.plantIdUrl && (
                  <a 
                    href={disease.plantIdUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on PlantID →
                  </a>
                )}
              </div>
            )}
          </div>
          <Badge 
            variant={disease.severity === 'critical' ? 'destructive' : disease.severity === 'high' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {disease.severity.toUpperCase()} Severity
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Affected Crops */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Affected Crops
          </h4>
          <div className="flex flex-wrap gap-2">
            {disease.affectedCrops.map(crop => (
              <Badge key={crop} variant="outline">{crop}</Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Symptoms */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Symptoms to Look For
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {disease.symptoms.map((symptom, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-600 mt-0.5">•</span>
                <span>{symptom}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Favorable Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Droplet className="w-4 h-4" />
              Favorable Conditions
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {disease.favorableConditions.map((condition, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Spreads By
            </h4>
            <div className="flex flex-wrap gap-2">
              {disease.spreadsBy.map(method => (
                <Badge key={method} variant="secondary">{method}</Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Pesticide Recommendations */}
        <div>
          <h4 className="font-semibold mb-4 text-lg flex items-center gap-2">
            💊 Recommended Pesticides & Treatment
          </h4>
          
          <div className="space-y-4">
            {disease.chemicalTreatments.map((pesticide, i) => (
              <Card key={i} className="bg-accent/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pesticide.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{pesticide.type}</Badge>
                        <span className="text-sm">{pesticide.activeIngredient}</span>
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-600">Safe</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-foreground mb-1">💧 Dosage:</p>
                      <p className="text-muted-foreground">{pesticide.dosage}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">🕐 Safety Period:</p>
                      <p className="text-muted-foreground">{pesticide.safetyPeriod} before harvest</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-sm mb-2">🎯 Application Method:</p>
                    <p className="text-sm text-muted-foreground">{pesticide.applicationMethod}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Safety Precautions:
                    </p>
                    <ul className="space-y-1">
                      {pesticide.precautions.map((precaution, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-orange-600 mt-1">⚠️</span>
                          <span>{precaution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Organic Treatments */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            🌿 Organic Treatment Options
          </h4>
          <ul className="space-y-2">
            {disease.organicTreatments.map((treatment, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>{treatment}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Cultural Practices */}
        <div>
          <h4 className="font-semibold mb-3">🌾 Cultural Practices & Prevention</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {disease.culturalPractices.map((practice, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary">→</span>
                <span>{practice}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preventive Measures */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Prevention is Better Than Cure
          </h4>
          <ul className="space-y-2">
            {disease.preventiveMeasures.map((measure, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>{measure}</span>
              </li>
            ))}
          </ul>
        </div>

        <Alert>
          <AlertDescription>
            <strong>⚠️ Important Advisory:</strong> Always follow local agricultural guidelines and regulations when using pesticides. 
            Consult with certified agricultural extension officers for personalized advice based on your region and crop variety.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
