import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, MapPin, Sprout, Search, Calendar, BookOpen, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cropModel, soilTypes } from '@/utils/cropModel';
import { handleDatabaseCreate, getUserFriendlyErrorMessage } from '@/utils/errorHandler';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import CropCareTimeline from '@/components/CropCareTimeline';
import { Textarea } from '@/components/ui/textarea';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FormData {
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  temperature: string;
  humidity: string;
  rainfall: string;
  phValue: string;
  soilType: string;
}

interface Recommendation {
  crop: string;
  confidence: number;
  imageUrl?: string;
  description?: string;
}

interface DateObservation {
  date: string;
  notes: string;
}

function LocationMarker({ position, setPosition }: any) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function CropRecommendationPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    temperature: '',
    humidity: '',
    rainfall: '',
    phValue: '',
    soilType: ''
  });
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [modelStatus, setModelStatus] = useState<'idle' | 'training' | 'ready'>('idle');
  const [trainingProgress, setTrainingProgress] = useState({ epoch: 0, total: 0 });
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<{ name: string; plantingDate: string; id: string } | null>(null);
  const [showCareDialog, setShowCareDialog] = useState(false);
  const [trackedCrops, setTrackedCrops] = useState<any[]>([]);
  const [editingCrop, setEditingCrop] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ plantingDate: '', notes: '', status: 'growing' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to India center
          setPosition([20.5937, 78.9629]);
        }
      );
    }
  }, []);

  // Load tracked crops
  useEffect(() => {
    if (user) {
      loadTrackedCrops();
    }
  }, [user]);

  const loadTrackedCrops = async () => {
    if (!user) return;
    
    try {
      const crops = await blink.db.cropRecommendations.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 10
      });
      
      // Filter only crops with planting date
      const tracked = crops.filter(c => c.plantingDate);
      setTrackedCrops(tracked);
    } catch (error) {
      console.error('Error loading tracked crops:', error);
    }
  };

  const handleStartTracking = async (cropName: string) => {
    if (!user) {
      toast.error('Please sign in to track crops');
      return;
    }

    const plantingDate = new Date().toISOString();
    
    const result = await handleDatabaseCreate(
      () => blink.db.cropRecommendations.create({
        userId: user.id,
        recommendedCrops: JSON.stringify([{ crop: cropName }]),
        plantingDate,
        locationName,
        latitude: position?.[0],
        longitude: position?.[1],
      }),
      `${cropName} is already being tracked`
    );
    
    if (result.success) {
      setSelectedCrop({ name: cropName, plantingDate });
      setShowCareDialog(true);
      await loadTrackedCrops();
      toast.success(`Started tracking ${cropName}!`);
    } else {
      const errorMessage = getUserFriendlyErrorMessage(result.error);
      toast.error(errorMessage);
    }
  };

  const handleViewCareGuide = (cropName: string, plantingDate: string, id: string) => {
    setSelectedCrop({ name: cropName, plantingDate, id });
    setShowCareDialog(true);
  };

  const handleEditCrop = (crop: any) => {
    setEditingCrop(crop);

    // Parse observations to get today's or most recent observation
    let todayNotes = '';
    try {
      const observations: DateObservation[] = JSON.parse(crop.notes || '[]');
      if (Array.isArray(observations) && observations.length > 0) {
        // Get most recent observation (first one since they're sorted by date desc)
        todayNotes = observations[0]?.notes || '';
      }
    } catch {
      // If notes is not JSON, use it as is
      todayNotes = crop.notes || '';
    }
    
    setEditForm({
      plantingDate: crop.plantingDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      notes: todayNotes,
      status: crop.status || 'growing'
    });
    setShowEditDialog(true);
  };

  const handleUpdateCrop = async () => {
    if (!editingCrop || !user) return;

    try {
      // Parse existing observations
      let observations: DateObservation[] = [];
      try {
        const parsed = JSON.parse(editingCrop.notes || '[]');
        observations = Array.isArray(parsed) ? parsed : [];
      } catch {
        observations = editingCrop.notes ? [{ date: new Date(editingCrop.plantingDate).toISOString().split('T')[0], notes: editingCrop.notes }] : [];
      }
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's already an observation for today
      const todayObservationIndex = observations.findIndex(o => o.date === today);
      
      if (editForm.notes) {
        if (todayObservationIndex >= 0) {
          // Update existing observation
          observations[todayObservationIndex].notes = editForm.notes;
        } else {
          // Add new observation for today
          observations.unshift({ date: today, notes: editForm.notes });
        }
      }
      
      // Save as JSON array
      const notesJson = JSON.stringify(observations);
      
      await blink.db.cropRecommendations.update(editingCrop.id, {
        plantingDate: new Date(editForm.plantingDate).toISOString(),
        notes: notesJson,
        status: editForm.status,
        updatedAt: new Date().toISOString()
      });

      await loadTrackedCrops();
      setShowEditDialog(false);
      setEditingCrop(null);
      toast.success('Crop details and observation saved successfully!');
    } catch (error) {
      console.error('Error updating crop:', error);
      toast.error('Failed to update crop details');
    }
  };

  const handleDeleteCrop = async (cropId: string) => {
    if (!user) return;
    
    const confirm = window.confirm('Are you sure you want to stop tracking this crop?');
    if (!confirm) return;

    try {
      await blink.db.cropRecommendations.delete(cropId);
      await loadTrackedCrops();
      toast.success('Crop removed from tracking');
    } catch (error) {
      console.error('Error deleting crop:', error);
      toast.error('Failed to remove crop');
    }
  };

  const fetchWeatherData = async (lat: number, lng: number) => {
    setFetchingWeather(true);
    try {
      // Fetch weather data from Open-Meteo (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`
      );
      const data = await response.json();
      
      if (data.current) {
        // Auto-populate temperature and humidity
        setFormData(prev => ({
          ...prev,
          temperature: data.current.temperature_2m?.toString() || prev.temperature,
          humidity: data.current.relative_humidity_2m?.toString() || prev.humidity,
        }));
        toast.success('Weather data updated automatically');
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      toast.error('Could not fetch weather data');
    } finally {
      setFetchingWeather(false);
    }
  };

  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const name = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationName(name);
      toast.success('Location updated');
      
      // Fetch weather data for this location
      await fetchWeatherData(lat, lng);
    } catch (error) {
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  useEffect(() => {
    if (position) {
      fetchLocationName(position[0], position[1]);
    }
  }, [position]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        setSearchResults(data);
      } else {
        toast.error('No locations found');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setLocationName(result.display_name);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected');
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to get recommendations');
      return;
    }

    setLoading(true);
    setModelStatus('idle');

    try {
      const input = {
        nitrogen: parseFloat(formData.nitrogen),
        phosphorus: parseFloat(formData.phosphorus),
        potassium: parseFloat(formData.potassium),
        temperature: parseFloat(formData.temperature),
        humidity: parseFloat(formData.humidity),
        rainfall: parseFloat(formData.rainfall),
        phValue: parseFloat(formData.phValue),
        soilType: formData.soilType
      };

      // Check if model is ready, if not it will train automatically
      if (!cropModel.isModelReady()) {
        setModelStatus('training');
        toast('Training ML model for the first time... This may take a minute.');
      }

      // Get recommendations using both AI and rule-based approach
      const aiRecommendations = await cropModel.predict(input);
      setModelStatus('ready');
      
      const ruleRecommendations = cropModel.getRuleBasedRecommendation(input);

      // Merge and deduplicate recommendations
      const merged = [...aiRecommendations];
      ruleRecommendations.forEach(rule => {
        if (!merged.find(m => m.crop === rule.crop)) {
          merged.push(rule);
        }
      });

      // Sort by confidence and take top 5
      const final = merged.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
      
      // Fetch crop images from database or generate them
      setLoadingImages(true);
      const recsWithImages = await Promise.all(
        final.map(async (rec) => {
          try {
            // Check if crop exists in database
            const crops = await blink.db.crops.list({
              where: { name: rec.crop }
            });
            
            if (crops.length > 0 && crops[0].imageUrl) {
              // Use existing image from database
              return {
                ...rec,
                imageUrl: crops[0].imageUrl,
                description: crops[0].description || ''
              };
            } else {
              // Generate image using AI
              const { data } = await blink.ai.generateImage({
                prompt: `A professional agricultural photograph of ${rec.crop} crop growing in a farm field. High quality, realistic, natural lighting, showing healthy plants.`,
                model: 'fal-ai/nano-banana',
                n: 1,
                size: '1024x1024'
              });
              
              const imageUrl = data[0].url;
              
              // Update database with generated image
              if (crops.length > 0) {
                await blink.db.crops.update(crops[0].id, { imageUrl });
              } else {
                // Create new crop entry
                await blink.db.crops.create({
                  name: rec.crop,
                  imageUrl,
                  description: `${rec.crop} - Recommended based on your soil and climate conditions`
                });
              }
              
              return {
                ...rec,
                imageUrl,
                description: `${rec.crop} - Recommended based on your soil and climate conditions`
              };
            }
          } catch (error) {
            console.error(`Error fetching/generating image for ${rec.crop}:`, error);
            return rec; // Return without image on error
          }
        })
      );
      
      setLoadingImages(false);
      setRecommendations(recsWithImages);

      // Save to database (without planting date - user can track specific crops later)
      const saveResult = await handleDatabaseCreate(
        () => blink.db.cropRecommendations.create({
          userId: user.id,
          nitrogen: input.nitrogen,
          phosphorus: input.phosphorus,
          potassium: input.potassium,
          temperature: input.temperature,
          humidity: input.humidity,
          rainfall: input.rainfall,
          phValue: input.phValue,
          soilType: input.soilType,
          latitude: position?.[0],
          longitude: position?.[1],
          locationName,
          recommendedCrops: JSON.stringify(recsWithImages),
          plantingDate: null // User will set this when they start tracking
        })
      );

      if (saveResult.success || saveResult.error?.statusCode === 409) {
        // Show success even if there's a conflict (duplicate recommendation is OK)
        toast.success('Recommendations generated successfully!');
      } else {
        console.error('Error saving recommendations:', saveResult.error);
        // Still show recommendations even if saving fails
        toast.warning('Recommendations generated, but could not be saved to history');
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Crop Recommendation</h1>
          <p className="text-muted-foreground">
            Get AI-powered crop recommendations based on soil and climate conditions
          </p>
        </div>

        {/* Tracked Crops Section */}
        {trackedCrops.length > 0 && (
          <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Your Tracked Crops
              </CardTitle>
              <CardDescription>
                Click on a crop to view care instructions, or use the edit button to update details. Select dates to view observations from different days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trackedCrops.map((crop, index) => {
                  const recs = JSON.parse(crop.recommendedCrops || '[]');
                  const cropName = recs[0]?.crop || 'Unknown';
                  const plantedDate = new Date(crop.plantingDate);
                  const today = new Date();
                  const daysSincePlanting = Math.floor((today.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  // Parse observations (stored as JSON array in notes field)
                  let observations: DateObservation[] = [];
                  try {
                    const parsed = JSON.parse(crop.notes || '[]');
                    observations = Array.isArray(parsed) ? parsed : [];
                  } catch {
                    // If notes is not JSON, treat as single observation
                    observations = crop.notes ? [{ date: new Date().toISOString().split('T')[0], notes: crop.notes }] : [];
                  }
                  
                  // Get selected date for this crop or use the most recent
                  const cropSelectedDate = selectedDate && selectedDate.startsWith(crop.id) 
                    ? selectedDate.split('_')[1] 
                    : observations[0]?.date;
                  
                  // Get current observation for selected date
                  const currentObservation = observations.find(o => o.date === cropSelectedDate);
                  
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-2 p-3 bg-background rounded-lg border hover:border-primary/50 transition-all group"
                    >
                      {/* Main crop info */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleViewCareGuide(cropName, crop.plantingDate, crop.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Sprout className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold capitalize">{cropName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>Day {daysSincePlanting}</span>
                              <span>•</span>
                              <span>Planted {plantedDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </button>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCrop(crop);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCrop(crop.id);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Date selector for observations */}
                      {observations.length > 0 && (
                        <div className="flex flex-col gap-2 ml-14 mr-0">
                          <div className="text-xs font-medium text-muted-foreground">View observations:</div>
                          <div className="flex flex-wrap gap-2">
                            {observations.map((obs, obsIndex) => {
                              const obsDate = new Date(obs.date);
                              const isSelected = cropSelectedDate === obs.date;
                              return (
                                <button
                                  key={obsIndex}
                                  onClick={() => setSelectedDate(`${crop.id}_${obs.date}`)}
                                  className={`text-xs px-2 py-1 rounded border transition-all ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-muted text-muted-foreground border-muted hover:bg-muted hover:border-primary/50'
                                  }`}
                                >
                                  {obsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Display observation for selected date */}
                      {currentObservation && (
                        <div className="ml-14 p-2 bg-muted/30 rounded border border-primary/20 text-xs">
                          <div className="font-medium text-primary mb-1">📝 Observation ({currentObservation.date}):</div>
                          <p className="text-muted-foreground leading-relaxed">{currentObservation.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ML Model Information Banner */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sprout className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Hybrid ML Model</h3>
                  {modelStatus === 'training' && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Training with 2200+ samples...</span>
                    </div>
                  )}
                  {modelStatus === 'ready' && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      ✓ Model Ready
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Our recommendation system uses a <strong>hybrid approach</strong> combining two powerful methods:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <strong className="text-foreground">Artificial Neural Network (ANN)</strong> - 
                      A deep learning model trained on <strong>2200 crop samples</strong> from Crop_recommendation.csv 
                      featuring 4 layers (64→32→16 neurons) with dropout regularization
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <strong className="text-foreground">Rule-Based Expert System</strong> - 
                      Agricultural domain knowledge encoded as rules for crop-climate suitability
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-background/80 rounded border text-xs text-muted-foreground">
                  <strong className="text-foreground">Training Data:</strong> 2200 samples covering 22 crops (rice, maize, cotton, banana, mango, etc.) | 
                  <strong className="text-foreground ml-2">Input Features:</strong> N, P, K, Temperature, Humidity, pH, Rainfall (7 features) 
                  → <strong className="text-foreground">Output:</strong> Top 5 crop recommendations with confidence scores
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!user && (
          <Alert className="mb-6">
            <AlertDescription>
              Please sign in to save your recommendations and access historical data
            </AlertDescription>
          </Alert>
        )}

        {/* Map Section - Full Width */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Select Your Location
            </CardTitle>
            <CardDescription>
              Search for a location or click on the map to select your farm location
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search location (e.g., Mumbai, Maharashtra)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  variant="outline"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-lg bg-background shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => selectSearchResult(result)}
                      className="w-full text-left px-4 py-3 hover:bg-muted border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">{result.display_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Lat: {parseFloat(result.lat).toFixed(4)}, Lng: {parseFloat(result.lon).toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-96 rounded-lg overflow-hidden border">
              {position ? (
                <MapContainer
                  center={position}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Selected Location:</span>
                {fetchingWeather && (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {locationName || 'Click on the map to select a location'}
              </p>
              {fetchingWeather && (
                <p className="text-xs text-primary mt-1">Fetching weather data...</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle>Enter Soil & Climate Data</CardTitle>
              <CardDescription>Provide accurate data for better recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nitrogen">Nitrogen (N)</Label>
                    <Input
                      id="nitrogen"
                      type="number"
                      step="0.1"
                      placeholder="0-140"
                      value={formData.nitrogen}
                      onChange={(e) => handleChange('nitrogen', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phosphorus">Phosphorus (P)</Label>
                    <Input
                      id="phosphorus"
                      type="number"
                      step="0.1"
                      placeholder="0-145"
                      value={formData.phosphorus}
                      onChange={(e) => handleChange('phosphorus', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="potassium">Potassium (K)</Label>
                    <Input
                      id="potassium"
                      type="number"
                      step="0.1"
                      placeholder="0-205"
                      value={formData.potassium}
                      onChange={(e) => handleChange('potassium', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature" className="flex items-center gap-2">
                      Temperature (°C)
                      {formData.temperature && (
                        <span className="text-xs text-primary">✓ Auto-filled</span>
                      )}
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      placeholder="0-50 (auto-filled from location)"
                      value={formData.temperature}
                      onChange={(e) => handleChange('temperature', e.target.value)}
                      required
                      className={formData.temperature ? "border-primary/50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="humidity" className="flex items-center gap-2">
                      Humidity (%)
                      {formData.humidity && (
                        <span className="text-xs text-primary">✓ Auto-filled</span>
                      )}
                    </Label>
                    <Input
                      id="humidity"
                      type="number"
                      step="0.1"
                      placeholder="0-100 (auto-filled from location)"
                      value={formData.humidity}
                      onChange={(e) => handleChange('humidity', e.target.value)}
                      required
                      className={formData.humidity ? "border-primary/50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rainfall">Rainfall (mm)</Label>
                    <Input
                      id="rainfall"
                      type="number"
                      step="0.1"
                      placeholder="0-3000"
                      value={formData.rainfall}
                      onChange={(e) => handleChange('rainfall', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phValue">pH Value</Label>
                    <Input
                      id="phValue"
                      type="number"
                      step="0.1"
                      placeholder="0-14"
                      value={formData.phValue}
                      onChange={(e) => handleChange('phValue', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="soilType">Soil Type</Label>
                    <Select
                      value={formData.soilType}
                      onValueChange={(value) => handleChange('soilType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select soil type" />
                      </SelectTrigger>
                      <SelectContent>
                        {soilTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sprout className="mr-2 h-4 w-4" />
                      Get Recommendations
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            {loadingImages && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Loading crop images...
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {recommendations.length > 0 && !loadingImages && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-primary" />
                    Recommended Crops
                  </CardTitle>
                  <CardDescription>
                    Generated using Hybrid ANN + Rule-Based ML Model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        {/* Crop Image */}
                        {rec.imageUrl ? (
                          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-background border-2 border-primary/20">
                            <img
                              src={rec.imageUrl}
                              alt={rec.crop}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sprout className="w-8 h-8 text-primary/50" />
                          </div>
                        )}
                        
                        {/* Crop Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {index + 1}
                              </div>
                              <h3 className="font-semibold text-lg">{rec.crop}</h3>
                            </div>
                          </div>
                          
                          {rec.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {rec.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Confidence:</span>
                              <span className="text-sm font-semibold text-primary">
                                {rec.confidence}%
                              </span>
                            </div>
                            <div className="flex-1 h-2 bg-background rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${rec.confidence}%` }}
                              />
                            </div>
                          </div>

                          {/* Track Crop Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartTracking(rec.crop)}
                            className="w-full text-xs"
                          >
                            <Calendar className="w-3 h-3 mr-1.5" />
                            Start Tracking & Get Care Guide
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Crop Care Dialog */}
      <Dialog open={showCareDialog} onOpenChange={setShowCareDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Day-by-Day Crop Care Guide
            </DialogTitle>
            <DialogDescription>
              Follow these stage-based instructions for optimal crop growth
            </DialogDescription>
          </DialogHeader>
          
          {selectedCrop && (
            <CropCareTimeline 
              cropName={selectedCrop.name} 
              plantingDate={selectedCrop.plantingDate} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Crop Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Edit Tracked Crop
            </DialogTitle>
            <DialogDescription>
              Update your crop tracking details
            </DialogDescription>
          </DialogHeader>
          
          {editingCrop && (
            <div className="space-y-4 py-4">
              {/* Crop Name (Read-only) */}
              <div className="space-y-2">
                <Label>Crop Name</Label>
                <Input
                  value={JSON.parse(editingCrop.recommendedCrops || '[]')[0]?.crop || 'Unknown'}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Planting Date */}
              <div className="space-y-2">
                <Label htmlFor="edit-planting-date">Planting Date</Label>
                <Input
                  id="edit-planting-date"
                  type="date"
                  value={editForm.plantingDate}
                  onChange={(e) => setEditForm({ ...editForm, plantingDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  {editForm.plantingDate && (() => {
                    const planted = new Date(editForm.plantingDate);
                    const today = new Date();
                    const days = Math.floor((today.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
                    return `${days} day${days !== 1 ? 's' : ''} since planting`;
                  })()}
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="edit-status">Crop Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="growing">🌱 Growing</SelectItem>
                    <SelectItem value="flowering">🌸 Flowering</SelectItem>
                    <SelectItem value="harvesting">🌾 Ready to Harvest</SelectItem>
                    <SelectItem value="harvested">✅ Harvested</SelectItem>
                    <SelectItem value="issue">⚠️ Needs Attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes / Observations</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add today's observations. Each day's notes are automatically dated and stored separately, allowing you to view historical observations by selecting different dates.
                </p>
                <Textarea
                  id="edit-notes"
                  placeholder="Add notes about crop health, weather conditions, or observations..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {editForm.notes.length} / 500 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingCrop(null);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpdateCrop}>
              <Edit2 className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
