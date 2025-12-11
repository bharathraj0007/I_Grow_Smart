import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper functions for consistent responses
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { imageUrl, organs = ["leaf"], cropName } = await req.json();

    if (!imageUrl) {
      return errorResponse("imageUrl is required", 400);
    }

    // Use Plantnet API for plant identification
    return await detectWithPlantnet(imageUrl, organs, cropName);
  } catch (error) {
    console.error("Plantnet detection error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});

// Plant identification using Plantnet API
async function detectWithPlantnet(imageUrl: string, organs: string[], cropName?: string) {
  try {
    console.log("Starting plant identification with Plantnet API...");
    console.log("Image URL:", imageUrl);
    console.log("Organs:", organs);
    console.log("Crop name:", cropName || "Not specified");

    // Validate image URL
    if (!imageUrl.startsWith('http')) {
      throw new Error('Invalid image URL format');
    }

    // Get Plantnet API key from environment
    const apiKey = Deno.env.get("PLANTNET_API_KEY");
    console.log("API key available:", !!apiKey);
    
    if (!apiKey) {
      throw new Error("PLANTNET_API_KEY not configured. Please add your Plantnet API key in project secrets.");
    }

    console.log("Calling Plantnet API for plant identification...");
    
    // Plantnet API endpoint
    // Note: Plantnet requires images to be downloaded and sent as multipart/form-data
    // The API is very strict about image format - must be JPEG or PNG
    console.log("Downloading image...");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    // Get the content type from the response
    const contentType = imageResponse.headers.get("content-type") || "";
    console.log("Image content type:", contentType);
    
    const imageBlob = await imageResponse.blob();
    console.log("Image downloaded, size:", imageBlob.size, "bytes");

    // Determine file extension and MIME type
    let filename = "plant.jpg";
    let mimeType = "image/jpeg";
    
    if (contentType.includes("png") || imageUrl.toLowerCase().includes(".png")) {
      filename = "plant.png";
      mimeType = "image/png";
    } else if (contentType.includes("jpg") || contentType.includes("jpeg") || 
               imageUrl.toLowerCase().includes(".jpg") || imageUrl.toLowerCase().includes(".jpeg")) {
      filename = "plant.jpg";
      mimeType = "image/jpeg";
    }
    
    console.log("Using filename:", filename, "with MIME type:", mimeType);

    // Create a new blob with explicit MIME type
    const typedBlob = new Blob([imageBlob], { type: mimeType });

    // Create form data for Plantnet API
    const formData = new FormData();
    formData.append("images", typedBlob, filename);
    formData.append("organs", organs.join(","));

    // Plantnet API URL (v2)
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`;
    
    console.log("Sending request to Plantnet API...");
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    console.log("Plantnet API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Plantnet API error:", errorText);
      throw new Error(`Plantnet API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Plantnet API response received successfully");

    // Parse Plantnet response
    if (!data.results || data.results.length === 0) {
      return jsonResponse({
        success: true,
        disease: "No Plant Identified",
        scientificName: "N/A",
        severity: "low",
        confidence: 0,
        symptoms: ["Unable to identify the plant. Please ensure the image is clear and shows the plant clearly."],
        affectedCrops: cropName ? [cropName] : [],
        favorableConditions: [],
        spreadsBy: [],
        chemicalTreatments: [],
        organicTreatments: [],
        culturalPractices: [],
        preventiveMeasures: ["Take a clearer photo", "Ensure good lighting", "Focus on characteristic features"],
        plantnetUrl: null,
        plantImages: []
      });
    }

    // Get the top match
    const topResult = data.results[0];
    const plantName = topResult.species.commonNames && topResult.species.commonNames.length > 0 
      ? topResult.species.commonNames[0] 
      : topResult.species.scientificNameWithoutAuthor;
    const scientificName = topResult.species.scientificNameWithoutAuthor;
    const confidence = Math.round(topResult.score * 100);
    const family = topResult.species.family.scientificName;
    const genus = topResult.species.genus.scientificName;
    
    console.log("Top match:", plantName, "Confidence:", confidence + "%");

    // Extract images
    const plantImages = topResult.images ? topResult.images.map((img: any) => ({
      url: img.url.m,
      organ: img.organ,
      author: img.author,
      license: img.license
    })) : [];

    // Generate detailed disease information based on plant identification
    const diseaseInfo = generateDiseaseInfoForPlant(plantName, scientificName, family);
    
    return jsonResponse({
      success: true,
      plantName: plantName,
      scientificName: scientificName,
      family: family,
      genus: genus,
      confidence: confidence,
      commonNames: topResult.species.commonNames || [],
      gbifId: topResult.gbif?.id || null,
      plantnetUrl: `https://identify.plantnet.org/species/${topResult.species.scientificNameWithoutAuthor.replace(/ /g, '_')}`,
      plantImages: plantImages,
      // Detailed disease information
      disease: diseaseInfo.disease,
      diseaseDescription: diseaseInfo.diseaseDescription,
      symptoms: diseaseInfo.symptoms,
      affectedCrops: cropName ? [cropName] : diseaseInfo.affectedCrops,
      severity: diseaseInfo.severity,
      favorableConditions: diseaseInfo.favorableConditions,
      spreadsBy: diseaseInfo.spreadsBy,
      chemicalTreatments: diseaseInfo.chemicalTreatments,
      organicTreatments: diseaseInfo.organicTreatments,
      culturalPractices: diseaseInfo.culturalPractices,
      preventiveMeasures: diseaseInfo.preventiveMeasures,
      treatmentSteps: diseaseInfo.treatmentSteps,
      eradicationSteps: diseaseInfo.eradicationSteps
    });
  } catch (error) {
    console.error("Plantnet detection error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : "Failed to identify plant";
    return errorResponse(`Plantnet identification failed: ${errorMessage}`, 500);
  }
}

// Generate detailed disease information based on identified plant
function generateDiseaseInfoForPlant(plantName: string, scientificName: string, family: string) {
  // Common plant diseases based on plant family and type
  const diseaseDatabase: { [key: string]: any } = {
    // Solanaceae family (Tomato, Potato, Pepper)
    'Solanaceae': {
      disease: 'Late Blight & Early Blight',
      diseaseDescription: 'Fungal diseases common in Solanaceae family plants (tomato, potato, pepper). Late blight is caused by Phytophthora infestans and early blight by Alternaria solani. These diseases can rapidly destroy entire crops if not managed properly.',
      symptoms: [
        'Dark brown to black lesions on leaves',
        'Water-soaked spots on stems and fruits',
        'White fuzzy growth on undersides of leaves (late blight)',
        'Concentric rings in leaf spots (early blight)',
        'Yellowing and wilting of affected areas',
        'Premature fruit drop'
      ],
      severity: 'high',
      affectedCrops: ['Tomato', 'Potato', 'Pepper', 'Eggplant'],
      favorableConditions: [
        'High humidity (80-90%)',
        'Cool temperatures (15-25°C)',
        'Prolonged leaf wetness',
        'Poor air circulation'
      ],
      spreadsBy: ['Wind', 'Water splash', 'Infected seeds', 'Contaminated tools'],
      chemicalTreatments: [
        {
          name: 'Mancozeb 75% WP',
          type: 'Fungicide',
          activeIngredient: 'Mancozeb',
          dosage: '2-2.5g per liter of water',
          applicationMethod: 'Foliar spray at 7-10 day intervals',
          safetyPeriod: '7-10 days',
          precautions: [
            'Wear protective clothing and gloves',
            'Avoid spraying during flowering',
            'Do not spray in windy conditions',
            'Keep away from water sources'
          ]
        },
        {
          name: 'Copper Oxychloride 50% WP',
          type: 'Fungicide',
          activeIngredient: 'Copper oxychloride',
          dosage: '3g per liter of water',
          applicationMethod: 'Spray thoroughly covering all plant parts',
          safetyPeriod: '3-5 days',
          precautions: [
            'Use protective equipment',
            'Avoid mixing with alkaline substances',
            'Do not apply during hot sunny days'
          ]
        }
      ],
      organicTreatments: [
        'Neem oil spray (5ml per liter)',
        'Baking soda solution (1 tablespoon per liter)',
        'Garlic-chili spray',
        'Bordeaux mixture (copper sulfate + lime)',
        'Remove and destroy infected plant parts'
      ],
      culturalPractices: [
        'Plant resistant varieties',
        'Ensure proper spacing for air circulation',
        'Avoid overhead irrigation',
        'Mulch to prevent soil splash',
        'Rotate crops every 3-4 years',
        'Remove plant debris after harvest'
      ],
      preventiveMeasures: [
        'Use certified disease-free seeds',
        'Maintain proper plant spacing (60-90cm)',
        'Water early in the morning',
        'Apply preventive copper sprays',
        'Monitor weather conditions',
        'Scout fields regularly for early detection'
      ],
      treatmentSteps: [
        '1. Remove all infected leaves and fruits immediately',
        '2. Destroy infected material (burn or bury away from field)',
        '3. Apply fungicide spray covering all plant surfaces',
        '4. Repeat applications every 7-10 days',
        '5. Improve drainage and reduce humidity',
        '6. Apply mulch to prevent soil splash'
      ],
      eradicationSteps: [
        'Step 1: Early Detection - Scout plants daily, especially during humid conditions',
        'Step 2: Isolation - Mark and isolate infected plants to prevent spread',
        'Step 3: Removal - Cut infected parts 5cm below visible symptoms',
        'Step 4: Chemical Control - Apply recommended fungicides immediately',
        'Step 5: Cultural Management - Improve ventilation, reduce watering',
        'Step 6: Monitoring - Continue weekly monitoring for 4-6 weeks',
        'Step 7: Prevention - Apply preventive sprays on healthy plants'
      ]
    },
    // Fabaceae family (Legumes)
    'Fabaceae': {
      disease: 'Rust & Powdery Mildew',
      diseaseDescription: 'Fungal diseases affecting leguminous crops. Rust is caused by Uromyces species and powdery mildew by Erysiphe polygoni. Both can significantly reduce yield and quality.',
      symptoms: [
        'Orange-brown pustules on leaves (rust)',
        'White powdery coating on leaves (mildew)',
        'Yellowing of affected leaves',
        'Premature leaf drop',
        'Stunted plant growth',
        'Reduced pod formation'
      ],
      severity: 'medium',
      affectedCrops: ['Pea', 'Bean', 'Lentil', 'Chickpea', 'Soybean'],
      favorableConditions: [
        'Moderate humidity (60-80%)',
        'Warm days and cool nights',
        'Poor air circulation',
        'Dense planting'
      ],
      spreadsBy: ['Wind', 'Water', 'Contact between plants'],
      chemicalTreatments: [
        {
          name: 'Sulfur 80% WP',
          type: 'Fungicide',
          activeIngredient: 'Sulfur',
          dosage: '2-3g per liter of water',
          applicationMethod: 'Foliar spray at first sign of disease',
          safetyPeriod: '3 days',
          precautions: [
            'Do not apply when temperature exceeds 32°C',
            'Wear dust mask when handling',
            'Keep away from eyes'
          ]
        }
      ],
      organicTreatments: [
        'Milk spray (1:9 milk to water ratio)',
        'Neem oil solution',
        'Baking soda and soap spray',
        'Remove infected leaves promptly'
      ],
      culturalPractices: [
        'Plant resistant varieties',
        'Ensure adequate spacing',
        'Avoid excessive nitrogen fertilization',
        'Remove crop residues',
        'Practice crop rotation'
      ],
      preventiveMeasures: [
        'Choose resistant cultivars',
        'Plant in well-ventilated areas',
        'Avoid late season planting',
        'Monitor regularly',
        'Apply preventive sulfur dusts'
      ],
      treatmentSteps: [
        '1. Identify disease early by checking leaf undersides',
        '2. Remove severely infected leaves',
        '3. Apply fungicide as per recommendations',
        '4. Repeat treatment at 10-14 day intervals',
        '5. Improve field drainage'
      ],
      eradicationSteps: [
        'Step 1: Early morning inspection for symptoms',
        'Step 2: Remove and dispose infected material',
        'Step 3: Apply sulfur or appropriate fungicide',
        'Step 4: Thin plants to improve airflow',
        'Step 5: Reduce irrigation frequency',
        'Step 6: Apply organic alternatives weekly'
      ]
    },
    // Poaceae family (Grasses/Cereals)
    'Poaceae': {
      disease: 'Blast Disease & Leaf Spot',
      diseaseDescription: 'Fungal diseases affecting cereal crops, particularly rice blast (Magnaporthe oryzae) and leaf spot diseases. These can cause severe yield losses if not controlled.',
      symptoms: [
        'Diamond-shaped lesions with gray centers',
        'Brown margins on leaf spots',
        'Blast lesions on stems and panicles',
        'White to gray fungal growth',
        'Premature grain filling stop',
        'Lodging of affected plants'
      ],
      severity: 'critical',
      affectedCrops: ['Rice', 'Wheat', 'Barley', 'Corn', 'Millet'],
      favorableConditions: [
        'High humidity (>90%)',
        'Temperature 25-28°C',
        'Prolonged wetness on leaves',
        'Excessive nitrogen fertilization',
        'Dense planting'
      ],
      spreadsBy: ['Wind-borne spores', 'Water splash', 'Infected seeds'],
      chemicalTreatments: [
        {
          name: 'Tricyclazole 75% WP',
          type: 'Fungicide',
          activeIngredient: 'Tricyclazole',
          dosage: '0.6g per liter of water',
          applicationMethod: 'Spray at tillering and booting stage',
          safetyPeriod: '21 days',
          precautions: [
            'Use protective equipment',
            'Do not contaminate water bodies',
            'Store in cool, dry place',
            'Follow label instructions carefully'
          ]
        },
        {
          name: 'Carbendazim 50% WP',
          type: 'Systemic fungicide',
          activeIngredient: 'Carbendazim',
          dosage: '1g per liter of water',
          applicationMethod: 'Foliar spray at disease onset',
          safetyPeriod: '14 days',
          precautions: [
            'Wear gloves and mask',
            'Avoid drift to neighboring crops',
            'Do not spray against wind'
          ]
        }
      ],
      organicTreatments: [
        'Pseudomonas fluorescens bio-fungicide',
        'Trichoderma viride application',
        'Silicon fertilization to strengthen plant',
        'Neem cake application to soil',
        'Removal of infected plants'
      ],
      culturalPractices: [
        'Use resistant varieties',
        'Balanced fertilization (avoid excess nitrogen)',
        'Proper water management',
        'Maintain proper plant spacing',
        'Remove volunteer plants',
        'Crop rotation with non-host crops'
      ],
      preventiveMeasures: [
        'Treat seeds with fungicides before sowing',
        'Use certified disease-free seeds',
        'Monitor fields regularly',
        'Apply silicon-based fertilizers',
        'Maintain optimal plant nutrition',
        'Install sticky traps for monitoring'
      ],
      treatmentSteps: [
        '1. Scout fields at critical growth stages',
        '2. Apply fungicide at first disease appearance',
        '3. Ensure good spray coverage',
        '4. Repeat application if needed',
        '5. Adjust water and fertilizer management',
        '6. Remove severely infected plants'
      ],
      eradicationSteps: [
        'Step 1: Identify disease hotspots in field',
        'Step 2: Apply recommended fungicides immediately',
        'Step 3: Drain excess water from field',
        'Step 4: Apply potash fertilizer to strengthen plants',
        'Step 5: Remove and burn infected stubble',
        'Step 6: Use bio-control agents',
        'Step 7: Continue monitoring until harvest'
      ]
    },
    // Default for other plants
    'default': {
      disease: 'Common Fungal & Bacterial Diseases',
      diseaseDescription: 'Plants can be affected by various fungal, bacterial, and viral diseases. Common issues include leaf spots, wilts, blights, and root rots. Proper identification and timely management are crucial.',
      symptoms: [
        'Leaf discoloration (yellowing, browning)',
        'Spots or lesions on leaves',
        'Wilting or drooping',
        'Stunted growth',
        'Root decay',
        'Premature leaf drop'
      ],
      severity: 'medium',
      affectedCrops: ['Various crops'],
      favorableConditions: [
        'High humidity',
        'Poor air circulation',
        'Wet conditions',
        'Stress conditions'
      ],
      spreadsBy: ['Wind', 'Water', 'Insects', 'Contaminated tools'],
      chemicalTreatments: [
        {
          name: 'Copper Fungicide',
          type: 'Broad spectrum fungicide',
          activeIngredient: 'Copper hydroxide',
          dosage: '2-3g per liter of water',
          applicationMethod: 'Spray all plant parts thoroughly',
          safetyPeriod: '3-5 days',
          precautions: [
            'Use protective equipment',
            'Avoid application during hot weather',
            'Do not mix with other chemicals'
          ]
        }
      ],
      organicTreatments: [
        'Neem oil spray',
        'Garlic extract',
        'Compost tea',
        'Remove infected parts',
        'Improve drainage'
      ],
      culturalPractices: [
        'Proper plant spacing',
        'Good drainage',
        'Crop rotation',
        'Sanitation',
        'Balanced nutrition'
      ],
      preventiveMeasures: [
        'Use healthy planting material',
        'Monitor plants regularly',
        'Maintain plant health',
        'Practice good hygiene',
        'Control pests'
      ],
      treatmentSteps: [
        '1. Identify the specific disease',
        '2. Remove infected plant parts',
        '3. Apply appropriate treatment',
        '4. Improve cultural conditions',
        '5. Monitor response to treatment'
      ],
      eradicationSteps: [
        'Step 1: Accurate disease identification',
        'Step 2: Isolate infected plants',
        'Step 3: Apply recommended control measures',
        'Step 4: Improve growing conditions',
        'Step 5: Continue monitoring',
        'Step 6: Practice preventive measures'
      ]
    }
  };

  // Match disease info based on plant family
  const diseaseInfo = diseaseDatabase[family] || diseaseDatabase['default'];
  
  return diseaseInfo;
}
