import * as tf from '@tensorflow/tfjs';

// Extract unique crop names from the CSV dataset
// Based on the actual dataset labels
export const cropNames = [
  'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas',
  'mothbeans', 'mungbean', 'blackgram', 'lentil', 'pomegranate',
  'banana', 'mango', 'grapes', 'watermelon', 'muskmelon',
  'apple', 'orange', 'papaya', 'coconut', 'cotton',
  'jute', 'coffee'
];

export const soilTypes = [
  'Sandy', 'Loamy', 'Clay', 'Silt', 'Peaty', 'Chalky', 'Saline'
];

interface CropInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  phValue: number;
  soilType: string;
}

interface CropRecommendationResult {
  crop: string;
  confidence: number;
}

// Training data interface
interface TrainingData {
  inputs: number[][];
  labels: number[];
}

// Simple neural network model for crop recommendation
class CropRecommendationModel {
  private model: tf.LayersModel | null = null;
  private isModelTrained = false;
  private trainingData: TrainingData | null = null;

  // Parse CSV data
  private async loadCSVData(): Promise<TrainingData> {
    const response = await fetch('/data/Crop_recommendation.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    const inputs: number[][] = [];
    const labels: number[] = [];
    
    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      // Extract features: N, P, K, temperature, humidity, ph, rainfall
      const features = [
        parseFloat(values[0]), // N
        parseFloat(values[1]), // P
        parseFloat(values[2]), // K
        parseFloat(values[3]), // temperature
        parseFloat(values[4]), // humidity
        parseFloat(values[5]), // ph
        parseFloat(values[6])  // rainfall
      ];
      
      // Get crop label
      const cropLabel = values[7].trim().toLowerCase();
      const cropIndex = cropNames.indexOf(cropLabel);
      
      if (cropIndex !== -1 && features.every(f => !isNaN(f))) {
        inputs.push(features);
        labels.push(cropIndex);
      }
    }
    
    console.log(`Loaded ${inputs.length} training samples with ${cropNames.length} crop classes`);
    
    return { inputs, labels };
  }

  // Normalize features
  private normalizeData(data: number[][]): { normalized: number[][], min: number[], max: number[] } {
    const numFeatures = data[0].length;
    const min: number[] = new Array(numFeatures).fill(Infinity);
    const max: number[] = new Array(numFeatures).fill(-Infinity);
    
    // Find min and max for each feature
    for (const row of data) {
      for (let i = 0; i < numFeatures; i++) {
        if (row[i] < min[i]) min[i] = row[i];
        if (row[i] > max[i]) max[i] = row[i];
      }
    }
    
    // Normalize to 0-1 range
    const normalized = data.map(row => 
      row.map((val, i) => {
        const range = max[i] - min[i];
        return range === 0 ? 0 : (val - min[i]) / range;
      })
    );
    
    return { normalized, min, max };
  }

  async buildModel() {
    // Create a simple sequential model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [7], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: cropNames.length, activation: 'softmax' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return this.model;
  }

  // Train the model with CSV data
  async trainModel(epochs: number = 50, onProgress?: (epoch: number, logs: any) => void): Promise<void> {
    console.log('Loading training data from CSV...');
    
    // Load training data
    if (!this.trainingData) {
      this.trainingData = await this.loadCSVData();
    }
    
    // Normalize inputs
    const { normalized } = this.normalizeData(this.trainingData.inputs);
    
    // Convert to tensors
    const xs = tf.tensor2d(normalized);
    const ys = tf.oneHot(tf.tensor1d(this.trainingData.labels, 'int32'), cropNames.length);
    
    // Build model if not exists
    if (!this.model) {
      await this.buildModel();
    }
    
    console.log('Training model...');
    
    // Train the model
    await this.model!.fit(xs, ys, {
      epochs: epochs,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}/${epochs} - loss: ${logs?.loss.toFixed(4)}, accuracy: ${logs?.acc.toFixed(4)}`);
          if (onProgress) {
            onProgress(epoch + 1, logs);
          }
        }
      }
    });
    
    this.isModelTrained = true;
    console.log('Model training completed!');
    
    // Cleanup
    xs.dispose();
    ys.dispose();
  }

  // Save trained model
  async saveModel(): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    await this.model.save('localstorage://crop-recommendation-model');
    console.log('Model saved to local storage');
  }

  // Load trained model
  async loadModel(): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel('localstorage://crop-recommendation-model');
      this.isModelTrained = true;
      console.log('Model loaded from local storage');
      return true;
    } catch (error) {
      console.log('No saved model found, will need to train');
      return false;
    }
  }

  isModelReady(): boolean {
    return this.isModelTrained && this.model !== null;
  }

  // Normalize input features based on dataset statistics
  private normalizeInput(input: CropInput): number[] {
    // Normalize values based on actual dataset ranges
    return [
      input.nitrogen / 140,           // Range: 0-140
      input.phosphorus / 145,         // Range: 0-145
      input.potassium / 205,          // Range: 0-205
      input.temperature / 50,         // Range: 0-50°C
      input.humidity / 100,           // Range: 0-100%
      input.phValue / 14,             // Range: 0-14
      input.rainfall / 3000           // Range: 0-3000mm
    ];
  }

  async predict(input: CropInput): Promise<CropRecommendationResult[]> {
    // Try to load existing model or train a new one
    if (!this.isModelTrained) {
      const loaded = await this.loadModel();
      if (!loaded) {
        console.log('Training model for the first time...');
        await this.trainModel(30); // Train with 30 epochs for first time
        await this.saveModel(); // Save for future use
      }
    }

    if (!this.model) {
      throw new Error('Model not available');
    }

    const normalizedInput = this.normalizeInput(input);
    const inputTensor = tf.tensor2d([normalizedInput]);

    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();

    // Get top 5 recommendations
    const results: CropRecommendationResult[] = [];
    const sortedIndices = Array.from(probabilities)
      .map((prob, idx) => ({ prob, idx }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5);

    for (const { prob, idx } of sortedIndices) {
      results.push({
        crop: cropNames[idx].charAt(0).toUpperCase() + cropNames[idx].slice(1), // Capitalize crop name
        confidence: Math.round(prob * 100)
      });
    }

    // Cleanup
    inputTensor.dispose();
    prediction.dispose();

    return results;
  }

  // Rule-based recommendation as fallback/enhancement
  getRuleBasedRecommendation(input: CropInput): CropRecommendationResult[] {
    const recommendations: CropRecommendationResult[] = [];

    // Rice: High water requirement
    if (input.rainfall > 150 && input.humidity > 70) {
      recommendations.push({ crop: 'Rice', confidence: 85 });
    }

    // Maize: Versatile crop
    if (input.temperature >= 18 && input.temperature <= 32 && input.rainfall > 60) {
      recommendations.push({ crop: 'Maize', confidence: 80 });
    }

    // Cotton: Warm climate
    if (input.temperature >= 21 && input.temperature <= 30 && input.rainfall > 60) {
      recommendations.push({ crop: 'Cotton', confidence: 75 });
    }

    // Chickpea: Cool season
    if (input.temperature >= 20 && input.temperature <= 30 && input.rainfall < 100) {
      recommendations.push({ crop: 'Chickpea', confidence: 78 });
    }

    // Banana: Warm, high humidity
    if (input.temperature >= 25 && input.humidity > 75 && input.rainfall > 100) {
      recommendations.push({ crop: 'Banana', confidence: 72 });
    }

    // Mango: Warm climate
    if (input.temperature >= 24 && input.temperature <= 30 && input.rainfall > 80) {
      recommendations.push({ crop: 'Mango', confidence: 70 });
    }

    // Grapes: Moderate climate
    if (input.temperature >= 15 && input.temperature <= 25 && input.phValue >= 6) {
      recommendations.push({ crop: 'Grapes', confidence: 68 });
    }

    // Watermelon: Warm, moderate water
    if (input.temperature >= 24 && input.temperature <= 32 && input.rainfall > 40) {
      recommendations.push({ crop: 'Watermelon', confidence: 66 });
    }

    // Coffee: Cool, high rainfall
    if (input.temperature >= 15 && input.temperature <= 28 && input.rainfall > 150) {
      recommendations.push({ crop: 'Coffee', confidence: 65 });
    }

    // Coconut: Warm, high humidity
    if (input.temperature >= 27 && input.humidity > 70 && input.rainfall > 150) {
      recommendations.push({ crop: 'Coconut', confidence: 63 });
    }

    // Sort by confidence and return top 5
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
}

export const cropModel = new CropRecommendationModel();
