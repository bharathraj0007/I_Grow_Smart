export interface Pesticide {
  name: string;
  type: string; // fungicide, insecticide, bactericide, etc.
  activeIngredient: string;
  dosage: string;
  applicationMethod: string;
  safetyPeriod: string; // Days before harvest
  precautions: string[];
}

export interface Disease {
  id: string;
  name: string;
  scientificName: string;
  affectedCrops: string[];
  symptoms: string[];
  causes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  spreadsBy: string[];
  favorableConditions: string[];
  preventiveMeasures: string[];
  organicTreatments: string[];
  chemicalTreatments: Pesticide[];
  culturalPractices: string[];
  imageKeywords: string[]; // For AI image matching
}

export const diseaseDatabase: Disease[] = [
  {
    id: 'rice_blast',
    name: 'Rice Blast',
    scientificName: 'Magnaporthe oryzae',
    affectedCrops: ['Rice', 'Wheat', 'Barley'],
    symptoms: [
      'Diamond-shaped lesions on leaves',
      'Gray-white centers with brown margins',
      'Lesions on stems and panicles',
      'Premature death of seedlings',
      'Reduced grain filling'
    ],
    causes: ['Fungal infection', 'High humidity', 'Excessive nitrogen'],
    severity: 'critical',
    spreadsBy: ['Wind-borne spores', 'Water splash', 'Infected seeds'],
    favorableConditions: [
      'Temperature 25-28°C',
      'High humidity (>90%)',
      'Long dew periods',
      'Cloudy weather'
    ],
    preventiveMeasures: [
      'Use resistant varieties',
      'Avoid excessive nitrogen fertilizer',
      'Proper water management',
      'Remove infected plant debris'
    ],
    organicTreatments: [
      'Neem oil spray (5ml/liter)',
      'Pseudomonas fluorescens application',
      'Trichoderma viride seed treatment'
    ],
    chemicalTreatments: [
      {
        name: 'Tricyclazole',
        type: 'Systemic Fungicide',
        activeIngredient: 'Tricyclazole 75% WP',
        dosage: '0.6 g/liter of water',
        applicationMethod: 'Foliar spray at disease appearance and repeat after 10-15 days',
        safetyPeriod: '15 days',
        precautions: [
          'Wear protective equipment',
          'Avoid spray drift to water bodies',
          'Do not mix with alkaline pesticides'
        ]
      },
      {
        name: 'Carbendazim',
        type: 'Systemic Fungicide',
        activeIngredient: 'Carbendazim 50% WP',
        dosage: '1 g/liter of water',
        applicationMethod: 'Spray at tillering and booting stage',
        safetyPeriod: '20 days',
        precautions: [
          'Avoid contact with skin',
          'Do not contaminate water sources',
          'Store away from food items'
        ]
      }
    ],
    culturalPractices: [
      'Maintain proper plant spacing',
      'Avoid water logging',
      'Balanced fertilization',
      'Crop rotation with non-host crops'
    ],
    imageKeywords: ['lesion', 'spots', 'diamond', 'gray', 'brown edges']
  },
  {
    id: 'late_blight',
    name: 'Late Blight',
    scientificName: 'Phytophthora infestans',
    affectedCrops: ['Potato', 'Tomato'],
    symptoms: [
      'Water-soaked lesions on leaves',
      'White mold on leaf undersides',
      'Brown to black spots',
      'Rapid leaf death',
      'Tuber or fruit rot'
    ],
    causes: ['Oomycete infection', 'Cool moist weather', 'Poor air circulation'],
    severity: 'critical',
    spreadsBy: ['Wind', 'Rain splash', 'Infected tubers'],
    favorableConditions: [
      'Temperature 15-20°C',
      'High humidity (>90%)',
      'Frequent rainfall',
      'Dense plant canopy'
    ],
    preventiveMeasures: [
      'Plant resistant varieties',
      'Proper spacing for air circulation',
      'Remove volunteer plants',
      'Avoid overhead irrigation'
    ],
    organicTreatments: [
      'Copper oxychloride spray',
      'Bordeaux mixture (1%)',
      'Baking soda solution (1 tablespoon per liter)'
    ],
    chemicalTreatments: [
      {
        name: 'Mancozeb',
        type: 'Contact Fungicide',
        activeIngredient: 'Mancozeb 75% WP',
        dosage: '2.5 g/liter of water',
        applicationMethod: 'Spray every 7-10 days during favorable conditions',
        safetyPeriod: '7 days',
        precautions: [
          'Avoid inhalation of dust',
          'Wash hands after handling',
          'Do not apply during flowering'
        ]
      },
      {
        name: 'Metalaxyl + Mancozeb',
        type: 'Systemic + Contact Fungicide',
        activeIngredient: 'Metalaxyl 8% + Mancozeb 64% WP',
        dosage: '2.5 g/liter of water',
        applicationMethod: 'Apply at first sign of disease, repeat every 10-14 days',
        safetyPeriod: '14 days',
        precautions: [
          'Use complete protective gear',
          'Alternate with other fungicides',
          'Do not apply more than 3 times per season'
        ]
      }
    ],
    culturalPractices: [
      'Hill up potatoes to protect tubers',
      'Remove infected plants immediately',
      'Mulch to prevent soil splash',
      'Proper drainage management'
    ],
    imageKeywords: ['water-soaked', 'mold', 'black spots', 'leaf death']
  },
  {
    id: 'powdery_mildew',
    name: 'Powdery Mildew',
    scientificName: 'Erysiphe spp.',
    affectedCrops: ['Wheat', 'Pea', 'Mango', 'Grapes', 'Cucumber'],
    symptoms: [
      'White powdery coating on leaves',
      'Yellow patches on upper leaf surface',
      'Stunted growth',
      'Distorted leaves',
      'Premature leaf drop'
    ],
    causes: ['Fungal infection', 'Dry conditions', 'Moderate temperatures'],
    severity: 'medium',
    spreadsBy: ['Wind-borne spores', 'Direct contact'],
    favorableConditions: [
      'Temperature 20-30°C',
      'Low humidity initially',
      'Shaded areas',
      'Crowded plants'
    ],
    preventiveMeasures: [
      'Ensure good air circulation',
      'Avoid excessive nitrogen',
      'Remove infected leaves',
      'Plant resistant varieties'
    ],
    organicTreatments: [
      'Milk spray (1:9 ratio with water)',
      'Neem oil (3ml/liter)',
      'Sulfur dust application',
      'Potassium bicarbonate spray'
    ],
    chemicalTreatments: [
      {
        name: 'Sulfur',
        type: 'Contact Fungicide',
        activeIngredient: 'Wettable Sulfur 80% WP',
        dosage: '2 g/liter of water',
        applicationMethod: 'Spray at first appearance, repeat every 15 days',
        safetyPeriod: '3 days',
        precautions: [
          'Do not apply when temperature exceeds 32°C',
          'Avoid mixing with oils',
          'Can be phytotoxic at high temperatures'
        ]
      },
      {
        name: 'Hexaconazole',
        type: 'Systemic Fungicide',
        activeIngredient: 'Hexaconazole 5% EC',
        dosage: '1 ml/liter of water',
        applicationMethod: 'Foliar application at disease onset',
        safetyPeriod: '10 days',
        precautions: [
          'Wear mask and gloves',
          'Avoid spray drift',
          'Do not use more than twice per season'
        ]
      }
    ],
    culturalPractices: [
      'Prune to improve air flow',
      'Avoid overhead watering',
      'Reduce plant density',
      'Sanitize tools between plants'
    ],
    imageKeywords: ['white powder', 'coating', 'yellow patches']
  },
  {
    id: 'bacterial_blight',
    name: 'Bacterial Blight',
    scientificName: 'Xanthomonas oryzae',
    affectedCrops: ['Rice', 'Cotton', 'Beans'],
    symptoms: [
      'Water-soaked lesions',
      'Yellow to white leaf streaks',
      'Wilting of leaves',
      'Bacterial ooze from lesions',
      'Kresek (seedling death)'
    ],
    causes: ['Bacterial infection', 'Wounds in plants', 'Insect damage'],
    severity: 'high',
    spreadsBy: ['Water', 'Wind', 'Contaminated tools', 'Insects'],
    favorableConditions: [
      'High humidity',
      'Warm temperatures (25-34°C)',
      'Frequent rainfall',
      'Flooded conditions'
    ],
    preventiveMeasures: [
      'Use disease-free seeds',
      'Plant resistant varieties',
      'Avoid injuries to plants',
      'Clean field drainage'
    ],
    organicTreatments: [
      'Copper oxychloride spray',
      'Pseudomonas fluorescens seed treatment',
      'Plant extracts (garlic, neem)'
    ],
    chemicalTreatments: [
      {
        name: 'Streptocycline',
        type: 'Bactericide',
        activeIngredient: 'Streptomycin Sulphate + Tetracycline',
        dosage: '0.5 g/liter of water',
        applicationMethod: 'Spray at early infection stage, repeat after 10 days',
        safetyPeriod: '7 days',
        precautions: [
          'Use only when necessary',
          'Do not exceed recommended dosage',
          'Rotate with copper-based products'
        ]
      },
      {
        name: 'Copper Hydroxide',
        type: 'Bactericide',
        activeIngredient: 'Copper Hydroxide 77% WP',
        dosage: '2 g/liter of water',
        applicationMethod: 'Preventive spray every 10-15 days',
        safetyPeriod: '1 day',
        precautions: [
          'Can cause phytotoxicity in some crops',
          'Do not mix with acidic products',
          'Wear protective equipment'
        ]
      }
    ],
    culturalPractices: [
      'Maintain proper water level',
      'Remove infected plants',
      'Balanced nitrogen application',
      'Avoid excessive plant density'
    ],
    imageKeywords: ['water-soaked', 'streaks', 'ooze', 'wilting']
  },
  {
    id: 'aphid_infestation',
    name: 'Aphid Infestation',
    scientificName: 'Aphidoidea',
    affectedCrops: ['Most crops', 'Vegetables', 'Cereals', 'Cotton'],
    symptoms: [
      'Curled or distorted leaves',
      'Sticky honeydew on leaves',
      'Black sooty mold',
      'Stunted plant growth',
      'Yellowing of leaves'
    ],
    causes: ['Insect pest', 'Warm weather', 'Succulent growth'],
    severity: 'medium',
    spreadsBy: ['Flying', 'Wind', 'Ant farming'],
    favorableConditions: [
      'Warm temperatures',
      'Dry weather',
      'Excessive nitrogen',
      'Protected environments'
    ],
    preventiveMeasures: [
      'Encourage natural predators',
      'Use reflective mulches',
      'Avoid excessive nitrogen',
      'Regular monitoring'
    ],
    organicTreatments: [
      'Neem oil spray (5ml/liter)',
      'Soap solution (5ml/liter)',
      'Garlic-chili spray',
      'Release ladybugs'
    ],
    chemicalTreatments: [
      {
        name: 'Imidacloprid',
        type: 'Systemic Insecticide',
        activeIngredient: 'Imidacloprid 17.8% SL',
        dosage: '0.5 ml/liter of water',
        applicationMethod: 'Foliar spray or soil drench',
        safetyPeriod: '21 days',
        precautions: [
          'Toxic to bees - avoid application during flowering',
          'Do not apply near water bodies',
          'Wear protective clothing'
        ]
      },
      {
        name: 'Acetamiprid',
        type: 'Systemic Insecticide',
        activeIngredient: 'Acetamiprid 20% SP',
        dosage: '0.5 g/liter of water',
        applicationMethod: 'Spray thoroughly covering both leaf surfaces',
        safetyPeriod: '7 days',
        precautions: [
          'Use only when aphid population is high',
          'Avoid during bee activity hours',
          'Do not exceed 2 applications per season'
        ]
      }
    ],
    culturalPractices: [
      'Use yellow sticky traps',
      'Inter-cropping with repellent plants',
      'Remove weed hosts',
      'Prune heavily infested parts'
    ],
    imageKeywords: ['aphids', 'curled leaves', 'honeydew', 'sticky']
  },
  {
    id: 'leaf_spot',
    name: 'Leaf Spot Disease',
    scientificName: 'Various pathogens',
    affectedCrops: ['Tomato', 'Pepper', 'Beans', 'Cucumber'],
    symptoms: [
      'Circular or irregular spots on leaves',
      'Brown or black lesions',
      'Yellow halo around spots',
      'Premature defoliation',
      'Reduced yield'
    ],
    causes: ['Fungal or bacterial infection', 'Wet foliage', 'Poor air circulation'],
    severity: 'medium',
    spreadsBy: ['Water splash', 'Wind', 'Infected debris'],
    favorableConditions: [
      'High humidity',
      'Warm temperatures',
      'Wet leaf surfaces',
      'Dense canopy'
    ],
    preventiveMeasures: [
      'Avoid overhead irrigation',
      'Proper plant spacing',
      'Remove infected leaves',
      'Crop rotation'
    ],
    organicTreatments: [
      'Copper-based fungicides',
      'Neem extract spray',
      'Baking soda solution',
      'Compost tea application'
    ],
    chemicalTreatments: [
      {
        name: 'Chlorothalonil',
        type: 'Broad-spectrum Fungicide',
        activeIngredient: 'Chlorothalonil 75% WP',
        dosage: '2 g/liter of water',
        applicationMethod: 'Spray every 7-14 days preventively',
        safetyPeriod: '7 days',
        precautions: [
          'Highly toxic to aquatic life',
          'May cause skin irritation',
          'Use protective equipment'
        ]
      },
      {
        name: 'Azoxystrobin',
        type: 'Systemic Fungicide',
        activeIngredient: 'Azoxystrobin 23% SC',
        dosage: '1 ml/liter of water',
        applicationMethod: 'Apply at first symptom appearance',
        safetyPeriod: '3 days',
        precautions: [
          'Do not apply more than twice consecutively',
          'Alternate with different mode of action',
          'Avoid spray drift'
        ]
      }
    ],
    culturalPractices: [
      'Mulch to prevent soil splash',
      'Water at base of plants',
      'Ensure good drainage',
      'Sanitize pruning tools'
    ],
    imageKeywords: ['spots', 'lesions', 'brown', 'black', 'circular']
  }
];

// Helper function to find diseases by symptoms
export function findDiseasesBySymptoms(symptoms: string[]): Disease[] {
  const matches: { disease: Disease; score: number }[] = [];
  
  diseaseDatabase.forEach(disease => {
    let score = 0;
    symptoms.forEach(symptom => {
      const symptomLower = symptom.toLowerCase();
      disease.symptoms.forEach(diseaseSymptom => {
        if (diseaseSymptom.toLowerCase().includes(symptomLower) || 
            symptomLower.includes(diseaseSymptom.toLowerCase())) {
          score++;
        }
      });
      disease.imageKeywords.forEach(keyword => {
        if (symptomLower.includes(keyword)) {
          score++;
        }
      });
    });
    if (score > 0) {
      matches.push({ disease, score });
    }
  });

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => m.disease);
}

// Helper function to find disease by name (for AI matching)
export function findDiseaseByName(name: string): Disease | undefined {
  const nameLower = name.toLowerCase();
  return diseaseDatabase.find(disease => 
    disease.name.toLowerCase().includes(nameLower) ||
    nameLower.includes(disease.name.toLowerCase()) ||
    disease.scientificName.toLowerCase().includes(nameLower)
  );
}
