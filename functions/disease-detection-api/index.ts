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
    const { imageUrl, cropName } = await req.json();

    if (!imageUrl) {
      return errorResponse("imageUrl is required", 400);
    }

    // Use PlantID API for specialized disease detection
    return await detectWithPlantID(imageUrl, cropName);
  } catch (error) {
    console.error("Disease detection error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});

// Disease detection using PlantID API
async function detectWithPlantID(imageUrl: string, cropName?: string) {
  try {
    console.log("Starting disease detection with PlantID API...");
    console.log("Image URL:", imageUrl);
    console.log("Crop name:", cropName || "Not specified");

    // Validate image URL
    if (!imageUrl.startsWith('http')) {
      console.error("Invalid image URL - must start with http/https");
      throw new Error('Invalid image URL format - must be a valid HTTP/HTTPS URL');
    }

    // Verify image URL has extension
    if (!imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      console.error("Image URL missing file extension:", imageUrl);
      throw new Error('Image URL must have a valid file extension (.jpg, .png, etc.)');
    }

    // Get PlantID API key from environment
    const apiKey = Deno.env.get("PLANT_DISEASE_API_KEY");
    console.log("API key available:", !!apiKey);
    
    if (!apiKey) {
      console.error("PLANT_DISEASE_API_KEY environment variable not set");
      throw new Error("PLANT_DISEASE_API_KEY not configured in environment");
    }

    console.log("Calling PlantID API for disease detection...");
    
    // PlantID API endpoint for health assessment
    const apiUrl = "https://api.plant.id/v2/health_assessment";
    
    // Prepare request body for PlantID API
    const requestBody = {
      images: [imageUrl],
      modifiers: ["crops_fast", "similar_images"],
      disease_details: [
        "cause",
        "common_names",
        "classification",
        "description",
        "treatment",
        "url"
      ],
      language: "en"
    };

    console.log("Request body prepared, sending to PlantID API...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("PlantID API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("PlantID API error response:", errorText);
      console.error("Response status:", response.status);
      throw new Error(`PlantID API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("PlantID API response received successfully");
    console.log("Response keys:", Object.keys(data));

    // Parse PlantID response
    if (!data.health_assessment) {
      throw new Error("No health assessment data in PlantID response");
    }

    const healthAssessment = data.health_assessment;
    const isHealthy = healthAssessment.is_healthy;
    const diseases = healthAssessment.diseases || [];

    console.log("Health status:", isHealthy ? "Healthy" : "Diseased");
    console.log("Number of diseases detected:", diseases.length);

    // If plant is healthy or no diseases found
    if (isHealthy || diseases.length === 0) {
      return jsonResponse({
        success: true,
        disease: "No Disease Detected",
        scientificName: "N/A",
        severity: "low",
        symptoms: ["Plant appears healthy"],
        affectedCrops: cropName ? [cropName] : [],
        favorableConditions: [],
        spreadsBy: [],
        chemicalTreatments: [],
        organicTreatments: ["Regular monitoring", "Maintain good plant health"],
        culturalPractices: ["Continue current care practices"],
        preventiveMeasures: ["Regular inspection", "Proper watering", "Good air circulation"],
      });
    }

    // Get the most probable disease (first in the array)
    const primaryDisease = diseases[0];
    const diseaseName = primaryDisease.name || "Unknown Disease";
    const probability = Math.round((primaryDisease.probability || 0) * 100);
    
    console.log("Primary disease:", diseaseName, "Probability:", probability + "%");

    // Extract disease details
    const diseaseDetails = primaryDisease.disease_details || {};
    const description = diseaseDetails.description || "No description available";
    const cause = diseaseDetails.cause || [];
    const commonNames = diseaseDetails.common_names || [];
    const treatment = diseaseDetails.treatment || {};

    // Extract treatment information
    const chemicalTreatments = [];
    const organicTreatments = [];
    
    if (treatment.chemical) {
      const chemicals = Array.isArray(treatment.chemical) ? treatment.chemical : [treatment.chemical];
      chemicals.forEach((chem: string) => {
        if (chem) {
          chemicalTreatments.push({
            name: chem,
            type: "Fungicide/Pesticide",
            active_ingredient: "As per product label",
            dosage: "Follow manufacturer's instructions",
            application_method: "Spray on affected areas",
            safety_period: "Check product label",
            precautions: ["Wear protective gear", "Follow label instructions", "Keep away from food and water sources"]
          });
        }
      });
    }

    if (treatment.biological) {
      const biological = Array.isArray(treatment.biological) ? treatment.biological : [treatment.biological];
      biological.forEach((bio: string) => {
        if (bio) organicTreatments.push(bio);
        });
    }

    if (treatment.prevention) {
      const prevention = Array.isArray(treatment.prevention) ? treatment.prevention : [treatment.prevention];
      prevention.forEach((prev: string) => {
        if (prev) organicTreatments.push(prev);
      });
    }

    // Determine severity based on probability
    let severity = "low";
    if (probability > 80) severity = "critical";
    else if (probability > 60) severity = "high";
    else if (probability > 40) severity = "medium";

    // Extract symptoms from description
    const symptoms = [description];
    if (commonNames.length > 0) {
      symptoms.push(`Also known as: ${commonNames.join(", ")}`);
    }

    return jsonResponse({
      success: true,
      disease: diseaseName,
      scientificName: cause.length > 0 ? cause[0] : "Unknown pathogen",
      severity: severity,
      confidence: probability,
      symptoms: symptoms,
      affectedCrops: cropName ? [cropName] : ["Various crops"],
      favorableConditions: ["High humidity", "Poor air circulation", "Dense planting"],
      spreadsBy: ["Water splash", "Wind", "Contact with infected plants"],
      chemicalTreatments: chemicalTreatments,
      organicTreatments: organicTreatments.length > 0 ? organicTreatments : ["Neem oil spray", "Remove infected parts", "Improve air circulation"],
      culturalPractices: [
        "Remove and destroy infected plant material",
        "Improve air circulation around plants",
        "Avoid overhead watering",
        "Practice crop rotation"
      ],
      preventiveMeasures: [
        "Use disease-resistant varieties",
        "Maintain proper plant spacing",
        "Regular monitoring and early detection",
        "Keep the area clean and weed-free"
      ],
      plantIdUrl: diseaseDetails.url || null,
      similarImages: data.similar_images || []
    });
  } catch (error) {
    console.error("PlantID detection error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze image";
    return errorResponse(`PlantID detection failed: ${errorMessage}`, 500);
  }
}
