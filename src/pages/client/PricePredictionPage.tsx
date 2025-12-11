import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, Info, LineChart } from 'lucide-react';
import { toast } from 'sonner';
import type { Crop } from '@/types';
import { predictPrice, getHistoricalTrend } from '@/utils/pricePredictor';

export default function PricePredictionPage() {
  const { user } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<number[]>([]);

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      const data = await blink.db.crops.list<Crop>({
        orderBy: { name: 'asc' },
        limit: 100
      });
      // Filter crops that have market prices
      const cropsWithPrices = data.filter(c => c.marketPrice && c.marketPrice > 0);
      setCrops(cropsWithPrices);
      
      if (cropsWithPrices.length === 0) {
        toast.error('No crops with price data available. Please add crop prices first.');
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
      toast.error('Failed to load crops');
    }
  };

  const handlePredict = async () => {
    if (!selectedCrop) {
      toast.error('Please select a crop');
      return;
    }

    setLoading(true);

    try {
      const crop = crops.find(c => c.id === selectedCrop);
      if (!crop || !crop.marketPrice || crop.marketPrice <= 0) {
        toast.error('Crop price data not available');
        setLoading(false);
        return;
      }

      // Use enhanced prediction model
      const result = predictPrice(crop.name, crop.marketPrice);
      
      // Get historical trend
      const historical = getHistoricalTrend(crop.marketPrice, 6);
      setHistoricalPrices(historical);
      
      setPrediction(result);

      // Save to database
      if (user) {
        await blink.db.pricePredictions.create({
          userId: user.id,
          cropId: selectedCrop,
          currentPrice: result.currentPrice,
          predictedPrice: result.predictedPrice,
          predictionDate: new Date().toISOString(),
          factors: JSON.stringify(result.factors)
        });
      }

      toast.success('Price prediction generated!');
    } catch (error) {
      console.error('Error predicting price:', error);
      toast.error('Failed to generate prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Crop Price Prediction</h1>
          <p className="text-muted-foreground text-lg">
            Get AI-powered price predictions to make informed selling decisions
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 bg-primary/5 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Our advanced prediction model analyzes seasonal patterns, market demand, supply conditions, weather impact, and market volatility to provide accurate 30-day price forecasts.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Select Crop
              </CardTitle>
              <CardDescription>Choose a crop to predict future prices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Crop Name</Label>
                <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crop" />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.length === 0 ? (
                      <SelectItem value="none" disabled>No crops available</SelectItem>
                    ) : (
                      crops.map((crop) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name} - ₹{crop.marketPrice}/kg
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handlePredict} 
                className="w-full" 
                disabled={loading || !selectedCrop || crops.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Market Data...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Predict Price
                  </>
                )}
              </Button>

              {selectedCrop && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Prediction timeframe: 30 days from today
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                <p className="font-semibold mb-2">📊 Prediction Model:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Seasonal patterns analysis</li>
                  <li>Market demand tracking</li>
                  <li>Supply condition assessment</li>
                  <li>Weather impact evaluation</li>
                  <li>Market volatility factors</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {prediction && (
            <div className="lg:col-span-2 space-y-6">
              {/* Main Prediction Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{prediction.crop}</span>
                      <Badge variant={prediction.trend === 'up' ? 'default' : prediction.trend === 'down' ? 'destructive' : 'secondary'}>
                        {prediction.trend === 'up' ? (
                          <><TrendingUp className="w-4 h-4 mr-1" /> Upward</>
                        ) : prediction.trend === 'down' ? (
                          <><TrendingDown className="w-4 h-4 mr-1" /> Downward</>
                        ) : (
                          <><Minus className="w-4 h-4 mr-1" /> Stable</>
                        )}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {prediction.confidence}% Confidence
                    </Badge>
                  </CardTitle>
                  <CardDescription>30-day price forecast based on market analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price Comparison */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                      <div className="text-2xl font-bold">₹{prediction.currentPrice}</div>
                      <div className="text-xs text-muted-foreground">per kg</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Predicted Price</div>
                      <div className="text-2xl font-bold text-primary">₹{prediction.predictedPrice}</div>
                      <div className="text-xs text-muted-foreground">per kg</div>
                    </div>
                    <div className="text-center p-4 bg-accent/10 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Change</div>
                      <div className={`text-2xl font-bold ${
                        prediction.changePercentage > 0 ? 'text-green-600' : 
                        prediction.changePercentage < 0 ? 'text-red-600' : 
                        'text-muted-foreground'
                      }`}>
                        {prediction.changePercentage > 0 ? '+' : ''}{prediction.changePercentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">₹{Math.abs(prediction.change)}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Price Movement</span>
                      <span className={`font-semibold ${
                        prediction.changePercentage > 0 ? 'text-green-600' : 
                        prediction.changePercentage < 0 ? 'text-red-600' : 
                        'text-muted-foreground'
                      }`}>
                        {prediction.changePercentage > 0 ? '+' : ''}{prediction.changePercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          prediction.changePercentage > 0 ? 'bg-green-600' : 
                          prediction.changePercentage < 0 ? 'bg-red-600' : 
                          'bg-muted-foreground'
                        }`}
                        style={{ width: `${Math.min(Math.abs(prediction.changePercentage) * 4, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Confidence Level */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Model Confidence</span>
                      <span className="font-semibold">{prediction.confidence}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-primary transition-all"
                        style={{ width: `${prediction.confidence}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Insights</CardTitle>
                  <CardDescription>Key factors influencing the price prediction</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prediction.insights.map((insight: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="text-lg mt-0.5">{insight.split(' ')[0]}</div>
                        <div className="text-sm">{insight.substring(insight.indexOf(' ') + 1)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Breakdown</CardTitle>
                  <CardDescription>Impact of each factor on the price prediction</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(prediction.factors).map(([key, value]: [string, any]) => {
                      const impact = ((value - 1) * 100).toFixed(1);
                      const isPositive = parseFloat(impact) > 0;
                      const isNeutral = Math.abs(parseFloat(impact)) < 2;
                      
                      return (
                        <div key={key} className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className={`text-lg font-semibold ${
                            isNeutral ? 'text-muted-foreground' :
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPositive ? '+' : ''}{impact}%
                          </div>
                          <div className="w-full bg-background rounded-full h-1.5 mt-2">
                            <div
                              className={`h-1.5 rounded-full ${
                                isNeutral ? 'bg-muted-foreground' :
                                isPositive ? 'bg-green-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(Math.abs(parseFloat(impact)) * 5, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-2">
                    {prediction.trend === 'up' 
                      ? '📈 Price Expected to Rise'
                      : prediction.trend === 'down'
                      ? '📉 Price Expected to Fall'
                      : '📊 Price Expected to Remain Stable'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {prediction.trend === 'up' 
                      ? 'Consider holding your stock for better prices. Market conditions are favorable for price increases over the next 30 days.'
                      : prediction.trend === 'down'
                      ? 'Consider selling soon to avoid potential losses. Market indicators suggest prices may decline in the coming month.'
                      : 'Prices are expected to remain relatively stable. Make selling decisions based on your immediate needs and storage capacity.'}
                  </p>
                  <div className="mt-4 p-3 bg-background/50 rounded-lg text-xs text-muted-foreground">
                    <strong>Disclaimer:</strong> Predictions are based on historical patterns and current market analysis. Actual prices may vary due to unforeseen factors. Use this as guidance only.
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!prediction && !loading && (
            <div className="lg:col-span-2 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <LineChart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No Prediction Yet</p>
                <p className="text-sm mt-2">Select a crop and click "Predict Price" to see the forecast</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
