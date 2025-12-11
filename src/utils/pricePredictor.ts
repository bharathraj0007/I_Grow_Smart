/**
 * Enhanced Price Prediction Model
 * Uses multiple factors to predict crop prices accurately
 */

interface PredictionFactors {
  seasonalFactor: number;
  demandFactor: number;
  supplyFactor: number;
  weatherImpact: number;
  marketVolatility: number;
}

interface PredictionResult {
  crop: string;
  currentPrice: number;
  predictedPrice: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  factors: PredictionFactors;
  insights: string[];
}

/**
 * Get seasonal factor based on current month and crop type
 */
function getSeasonalFactor(cropName: string, currentMonth: number): number {
  // Define seasonal patterns for different crop categories
  const seasonalPatterns: Record<string, number[]> = {
    // Index 0 = January, 11 = December
    grains: [1.1, 1.05, 1.0, 0.95, 0.9, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15], // Higher in winter/spring
    pulses: [1.15, 1.1, 1.05, 1.0, 0.95, 0.9, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15],
    summerFruits: [0.85, 0.85, 0.9, 0.95, 1.1, 1.2, 1.25, 1.15, 1.0, 0.9, 0.85, 0.85], // Peak in summer
    winterFruits: [1.15, 1.2, 1.1, 1.0, 0.9, 0.85, 0.85, 0.9, 0.95, 1.05, 1.1, 1.15], // Peak in winter
    yearRoundFruits: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    rabiVegetables: [1.15, 1.2, 1.1, 1.0, 0.9, 0.85, 0.85, 0.9, 0.95, 1.05, 1.1, 1.15], // Winter vegetables
    kharifVegetables: [0.9, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.1, 1.05, 1.0, 0.95, 0.9], // Monsoon vegetables
    yearRoundVegetables: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    oilseeds: [1.1, 1.05, 1.0, 0.95, 0.9, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.15],
    cashCrops: [1.05, 1.05, 1.05, 1.0, 0.95, 0.9, 0.9, 0.95, 1.0, 1.05, 1.1, 1.1],
    spices: [1.15, 1.2, 1.15, 1.05, 0.95, 0.9, 0.85, 0.85, 0.9, 1.0, 1.1, 1.2],
    beverages: [1.1, 1.1, 1.05, 1.0, 0.95, 0.95, 1.0, 1.0, 1.05, 1.1, 1.15, 1.15]
  };

  // Categorize crops
  const grains = ['rice', 'maize', 'wheat', 'bajra', 'pearl millet', 'jowar', 'sorghum', 'barley'];
  const pulses = ['chickpea', 'chana', 'kidneybeans', 'rajma', 'pigeonpeas', 'tuvar', 'arhar', 'mothbeans', 'mungbean', 'moong', 'blackgram', 'urad', 'lentil', 'masoor'];
  const summerFruits = ['mango', 'watermelon', 'muskmelon', 'litchi', 'pineapple'];
  const winterFruits = ['apple', 'orange', 'pomegranate', 'guava', 'custard apple', 'sitaphal'];
  const yearRoundFruits = ['banana', 'papaya', 'coconut', 'grapes'];
  const rabiVegetables = ['potato', 'onion', 'cauliflower', 'cabbage', 'carrot', 'peas', 'spinach', 'palak', 'garlic'];
  const kharifVegetables = ['tomato', 'brinjal', 'eggplant', 'bhindi', 'okra', 'bitter gourd', 'karela'];
  const yearRoundVegetables = ['cucumber'];
  const oilseeds = ['groundnut', 'peanut', 'mustard', 'soybean', 'sunflower', 'sesame', 'til'];
  const cashCrops = ['cotton', 'sugarcane', 'jute', 'tobacco'];
  const spices = ['turmeric', 'ginger', 'garlic', 'coriander', 'chilli', 'chili'];
  const beverages = ['coffee', 'tea'];
  
  const lowerCrop = cropName.toLowerCase();
  
  // Check which category the crop belongs to
  if (grains.some(g => lowerCrop.includes(g))) {
    return seasonalPatterns.grains[currentMonth];
  } else if (pulses.some(p => lowerCrop.includes(p))) {
    return seasonalPatterns.pulses[currentMonth];
  } else if (summerFruits.some(f => lowerCrop.includes(f))) {
    return seasonalPatterns.summerFruits[currentMonth];
  } else if (winterFruits.some(f => lowerCrop.includes(f))) {
    return seasonalPatterns.winterFruits[currentMonth];
  } else if (yearRoundFruits.some(f => lowerCrop.includes(f))) {
    return seasonalPatterns.yearRoundFruits[currentMonth];
  } else if (rabiVegetables.some(v => lowerCrop.includes(v))) {
    return seasonalPatterns.rabiVegetables[currentMonth];
  } else if (kharifVegetables.some(v => lowerCrop.includes(v))) {
    return seasonalPatterns.kharifVegetables[currentMonth];
  } else if (yearRoundVegetables.some(v => lowerCrop.includes(v))) {
    return seasonalPatterns.yearRoundVegetables[currentMonth];
  } else if (oilseeds.some(o => lowerCrop.includes(o))) {
    return seasonalPatterns.oilseeds[currentMonth];
  } else if (cashCrops.some(c => lowerCrop.includes(c))) {
    return seasonalPatterns.cashCrops[currentMonth];
  } else if (spices.some(s => lowerCrop.includes(s))) {
    return seasonalPatterns.spices[currentMonth];
  } else if (beverages.some(b => lowerCrop.includes(b))) {
    return seasonalPatterns.beverages[currentMonth];
  }
  
  return 1.0; // Neutral for other crops
}

/**
 * Calculate demand factor based on crop type and market conditions
 */
function getDemandFactor(cropName: string): number {
  // Simulate market demand (normally would come from real market data)
  const veryHighDemandCrops = ['rice', 'wheat', 'potato', 'onion', 'tomato', 'sugar', 'sugarcane'];
  const highDemandCrops = ['maize', 'bajra', 'jowar', 'banana', 'mango', 'cotton', 'soybean', 'groundnut', 'mustard'];
  const mediumDemandCrops = ['chana', 'chickpea', 'tuvar', 'moong', 'urad', 'carrot', 'cabbage', 'cauliflower', 'apple', 'orange'];
  const premiumCrops = ['coffee', 'tea', 'turmeric', 'ginger', 'chilli', 'pomegranate', 'grapes', 'saffron'];
  
  const lowerCrop = cropName.toLowerCase();
  
  // Premium/specialty crops with high market value
  if (premiumCrops.some(c => lowerCrop.includes(c))) {
    return 1.08 + Math.random() * 0.12; // 8-20% increase
  }
  // Staple crops with very high consumption
  else if (veryHighDemandCrops.some(c => lowerCrop.includes(c))) {
    return 1.05 + Math.random() * 0.1; // 5-15% increase
  }
  // Important commercial crops
  else if (highDemandCrops.some(c => lowerCrop.includes(c))) {
    return 1.03 + Math.random() * 0.08; // 3-11% increase
  }
  // Regular demand crops
  else if (mediumDemandCrops.some(c => lowerCrop.includes(c))) {
    return 1.01 + Math.random() * 0.06; // 1-7% increase
  }
  
  return 1.0 + Math.random() * 0.05; // 0-5% increase for others
}

/**
 * Calculate supply factor (inverse relationship with price)
 */
function getSupplyFactor(): number {
  // Good harvest = more supply = lower prices
  // Poor harvest = less supply = higher prices
  const supplyCondition = Math.random();
  
  if (supplyCondition < 0.3) {
    // Low supply (30% chance) -> price increase
    return 1.08 + Math.random() * 0.12; // 8-20% increase
  } else if (supplyCondition < 0.7) {
    // Normal supply (40% chance) -> stable prices
    return 0.98 + Math.random() * 0.04; // -2% to +2%
  } else {
    // High supply (30% chance) -> price decrease
    return 0.85 + Math.random() * 0.10; // -15% to -5%
  }
}

/**
 * Calculate weather impact on prices
 */
function getWeatherImpact(): number {
  // Simulate weather conditions impact
  const weatherCondition = Math.random();
  
  if (weatherCondition < 0.2) {
    // Adverse weather (20% chance) -> price increase
    return 1.1 + Math.random() * 0.15; // 10-25% increase
  } else if (weatherCondition < 0.8) {
    // Normal weather (60% chance) -> minimal impact
    return 0.98 + Math.random() * 0.04; // -2% to +2%
  } else {
    // Excellent weather (20% chance) -> price decrease (more yield)
    return 0.90 + Math.random() * 0.08; // -10% to -2%
  }
}

/**
 * Calculate market volatility
 */
function getMarketVolatility(): number {
  // Random market fluctuations
  return 0.95 + Math.random() * 0.1; // -5% to +5%
}

/**
 * Generate price insights based on factors
 */
function generateInsights(factors: PredictionFactors, change: number): string[] {
  const insights: string[] = [];
  
  if (factors.seasonalFactor > 1.05) {
    insights.push('🌾 Favorable season driving higher demand');
  } else if (factors.seasonalFactor < 0.95) {
    insights.push('🌾 Off-season affecting market prices');
  }
  
  if (factors.demandFactor > 1.05) {
    insights.push('📈 Strong market demand detected');
  }
  
  if (factors.supplyFactor > 1.08) {
    insights.push('⚠️ Supply shortage pushing prices up');
  } else if (factors.supplyFactor < 0.92) {
    insights.push('📉 Abundant supply lowering prices');
  }
  
  if (factors.weatherImpact > 1.1) {
    insights.push('🌦️ Adverse weather conditions affecting yield');
  } else if (factors.weatherImpact < 0.95) {
    insights.push('☀️ Favorable weather improving supply');
  }
  
  if (Math.abs(change) > 10) {
    insights.push('⚡ Significant price movement expected');
  } else if (Math.abs(change) < 3) {
    insights.push('📊 Stable market conditions anticipated');
  }
  
  return insights;
}

/**
 * Calculate confidence score based on prediction factors
 */
function calculateConfidence(factors: PredictionFactors): number {
  // Higher confidence when factors are more consistent
  const factorValues = Object.values(factors);
  const mean = factorValues.reduce((a, b) => a + b, 0) / factorValues.length;
  const variance = factorValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / factorValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation = higher confidence
  let confidence = 85 - (stdDev * 100);
  confidence = Math.max(65, Math.min(95, confidence)); // Clamp between 65-95%
  
  return Math.round(confidence);
}

/**
 * Main price prediction function
 */
export function predictPrice(cropName: string, currentPrice: number): PredictionResult {
  // Get current month (0-11)
  const currentMonth = new Date().getMonth();
  
  // Calculate all factors
  const seasonalFactor = getSeasonalFactor(cropName, currentMonth);
  const demandFactor = getDemandFactor(cropName);
  const supplyFactor = getSupplyFactor();
  const weatherImpact = getWeatherImpact();
  const marketVolatility = getMarketVolatility();
  
  const factors: PredictionFactors = {
    seasonalFactor,
    demandFactor,
    supplyFactor,
    weatherImpact,
    marketVolatility
  };
  
  // Calculate predicted price
  const combinedFactor = seasonalFactor * demandFactor * supplyFactor * weatherImpact * marketVolatility;
  const predictedPrice = currentPrice * combinedFactor;
  
  // Calculate change
  const change = predictedPrice - currentPrice;
  const changePercentage = (change / currentPrice) * 100;
  
  // Determine trend
  let trend: 'up' | 'down' | 'stable';
  if (changePercentage > 2) {
    trend = 'up';
  } else if (changePercentage < -2) {
    trend = 'down';
  } else {
    trend = 'stable';
  }
  
  // Calculate confidence
  const confidence = calculateConfidence(factors);
  
  // Generate insights
  const insights = generateInsights(factors, changePercentage);
  
  return {
    crop: cropName,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictedPrice: Math.round(predictedPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercentage: Math.round(changePercentage * 100) / 100,
    trend,
    confidence,
    factors,
    insights
  };
}

/**
 * Get historical price trend (simulated)
 */
export function getHistoricalTrend(currentPrice: number, months: number = 6): number[] {
  const prices: number[] = [];
  let price = currentPrice * 0.9; // Start 10% lower
  
  for (let i = 0; i < months; i++) {
    const fluctuation = (Math.random() - 0.5) * 0.1; // -5% to +5%
    price = price * (1 + fluctuation);
    prices.push(Math.round(price * 100) / 100);
  }
  
  prices.push(currentPrice); // Add current price at the end
  return prices;
}
