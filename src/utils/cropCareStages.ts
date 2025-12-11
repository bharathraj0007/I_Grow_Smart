// Crop care stages data structure with day-based instructions
// This provides stage-based guidance for farmers on how to care for crops

export interface CareStage {
  name: string;
  dayRange: string;
  days: { start: number; end: number };
  icon: string;
  activities: string[];
  tips: string[];
  warnings?: string[];
}

export interface CropCareData {
  [cropName: string]: {
    totalDuration: number; // Total days to harvest
    stages: CareStage[];
  };
}

// Comprehensive crop care data for major crops
export const cropCareData: CropCareData = {
  rice: {
    totalDuration: 120,
    stages: [
      {
        name: 'Land Preparation',
        dayRange: 'Day 1-7',
        days: { start: 1, end: 7 },
        icon: '🚜',
        activities: [
          'Plow the field 2-3 times to achieve fine tilth',
          'Level the field properly for uniform water distribution',
          'Apply basal dose of fertilizers (FYM 10-12 tons/hectare)',
          'Create bunds for water retention',
        ],
        tips: [
          'Ensure proper drainage channels',
          'Remove weeds and crop residues',
          'Test soil pH (ideal: 6.0-7.0)',
        ],
      },
      {
        name: 'Nursery & Sowing',
        dayRange: 'Day 8-30',
        days: { start: 8, end: 30 },
        icon: '🌱',
        activities: [
          'Prepare nursery beds with fine soil',
          'Soak seeds in water for 24 hours',
          'Sow pre-germinated seeds in nursery',
          'Maintain 2-3 cm water level in nursery',
          'Prepare main field with puddling',
        ],
        tips: [
          'Use certified seeds (20-25 kg/hectare)',
          'Treat seeds with fungicide',
          'Maintain nursery for 25-30 days',
        ],
        warnings: ['Protect nursery from birds and pests'],
      },
      {
        name: 'Transplanting',
        dayRange: 'Day 31-35',
        days: { start: 31, end: 35 },
        icon: '🌾',
        activities: [
          'Uproot 25-30 day old seedlings carefully',
          'Transplant 2-3 seedlings per hill',
          'Maintain spacing of 20×15 cm',
          'Keep 5 cm standing water after transplanting',
        ],
        tips: [
          'Transplant in the evening or on cloudy days',
          'Complete within 3-5 days',
          'Ensure roots are well covered with soil',
        ],
      },
      {
        name: 'Vegetative Growth',
        dayRange: 'Day 36-60',
        days: { start: 36, end: 60 },
        icon: '🌿',
        activities: [
          'Apply first top dressing of urea (after 21 days of transplanting)',
          'Maintain 5-7 cm water level',
          'Manual weeding or herbicide application',
          'Monitor for leaf folder and stem borer',
        ],
        tips: [
          'Apply nitrogen in split doses',
          'Drain field before weeding',
          'Refill water after 2-3 days',
        ],
        warnings: ['Watch for bacterial leaf blight', 'Control weeds before 40 days'],
      },
      {
        name: 'Tillering Stage',
        dayRange: 'Day 61-80',
        days: { start: 61, end: 80 },
        icon: '🌾',
        activities: [
          'Apply second top dressing of urea',
          'Maintain continuous flooding (5-10 cm)',
          'Remove weak and unproductive tillers',
          'Apply potash if deficiency observed',
        ],
        tips: [
          'Maximum tillering occurs during this period',
          'Ensure adequate water supply',
          'Monitor for blast disease',
        ],
      },
      {
        name: 'Panicle Initiation',
        dayRange: 'Day 81-95',
        days: { start: 81, end: 95 },
        icon: '🌾',
        activities: [
          'Maintain 5 cm water level continuously',
          'Apply third split of nitrogen',
          'Monitor for neck blast disease',
          'Spray micronutrients if needed (Zinc, Iron)',
        ],
        tips: [
          'Critical stage for water management',
          'Never allow water stress',
          'Control brown plant hopper',
        ],
        warnings: ['Most sensitive stage - avoid stress'],
      },
      {
        name: 'Flowering & Grain Filling',
        dayRange: 'Day 96-110',
        days: { start: 96, end: 110 },
        icon: '🌾',
        activities: [
          'Maintain 5 cm water level',
          'Monitor for grain discoloration',
          'Control birds and rats',
          'Apply foliar spray if deficiency visible',
        ],
        tips: [
          'Avoid water stress during flowering',
          'Watch for false smut and sheath blight',
          'Good care ensures better grain formation',
        ],
      },
      {
        name: 'Maturity & Harvest',
        dayRange: 'Day 111-120',
        days: { start: 111, end: 120 },
        icon: '🌾',
        activities: [
          'Drain field 10-15 days before harvest',
          'Harvest when 80% grains turn golden yellow',
          'Cut crop 15-20 cm above ground',
          'Thresh immediately after harvest',
          'Sun dry grains to 14% moisture',
        ],
        tips: [
          'Harvest at right maturity to avoid shattering',
          'Use combine harvester or manual harvesting',
          'Proper storage prevents pest damage',
        ],
        warnings: ['Delay in harvest causes grain shattering'],
      },
    ],
  },
  maize: {
    totalDuration: 90,
    stages: [
      {
        name: 'Land Preparation',
        dayRange: 'Day 1-7',
        days: { start: 1, end: 7 },
        icon: '🚜',
        activities: [
          'Deep plowing followed by 2-3 harrowings',
          'Apply farmyard manure (10-12 tons/hectare)',
          'Level the field for uniform germination',
          'Create ridges and furrows if needed',
        ],
        tips: ['Ensure good soil tilth', 'Remove previous crop residues', 'Test soil for nutrients'],
      },
      {
        name: 'Sowing',
        dayRange: 'Day 8-10',
        days: { start: 8, end: 10 },
        icon: '🌱',
        activities: [
          'Treat seeds with fungicide',
          'Sow seeds at 3-5 cm depth',
          'Maintain plant spacing of 60×20 cm (75,000 plants/hectare)',
          'Apply basal fertilizers (N:P:K)',
        ],
        tips: [
          'Use hybrid seeds for better yield',
          'Sow 20-25 kg seeds per hectare',
          'Ensure adequate soil moisture',
        ],
      },
      {
        name: 'Germination & Early Growth',
        dayRange: 'Day 11-25',
        days: { start: 11, end: 25 },
        icon: '🌿',
        activities: [
          'First irrigation after 10-15 days if needed',
          'Gap filling within 10 days of sowing',
          'First weeding at 20 days',
          'Apply first nitrogen dose after 25 days',
        ],
        tips: ['Protect from birds during germination', 'Control cutworms and shoot fly', 'Thin to one plant per hill'],
        warnings: ['Critical for establishment - monitor closely'],
      },
      {
        name: 'Vegetative Growth',
        dayRange: 'Day 26-45',
        days: { start: 26, end: 45 },
        icon: '🌿',
        activities: [
          'Apply second dose of nitrogen at 30-35 days',
          'Earthing up/ridging at 30-35 days',
          'Regular irrigation (7-10 days interval)',
          'Second weeding if needed',
          'Monitor for stem borer',
        ],
        tips: ['Earthing up provides plant support', 'Apply mulch to conserve moisture', 'Scout for fall armyworm'],
      },
      {
        name: 'Tasseling & Silking',
        dayRange: 'Day 46-60',
        days: { start: 46, end: 60 },
        icon: '🌾',
        activities: [
          'Ensure continuous water supply',
          'Apply final nitrogen dose at 45 days',
          'Monitor pollination (morning is best)',
          'Control corn borer and aphids',
        ],
        tips: [
          'Most critical stage for water',
          'Water stress reduces grain formation',
          'Good pollination = good yield',
        ],
        warnings: ['Water stress during this stage severely reduces yield'],
      },
      {
        name: 'Grain Filling',
        dayRange: 'Day 61-75',
        days: { start: 61, end: 75 },
        icon: '🌽',
        activities: [
          'Maintain adequate moisture',
          'Protect from birds and rodents',
          'Monitor for post-flowering stalk rot',
          'Remove diseased plants',
        ],
        tips: ['Grains develop rapidly now', 'Adequate water ensures plump grains', 'Watch for premature drying'],
      },
      {
        name: 'Maturity & Harvest',
        dayRange: 'Day 76-90',
        days: { start: 76, end: 90 },
        icon: '🌽',
        activities: [
          'Stop irrigation 10-15 days before harvest',
          'Harvest when cobs are fully mature',
          'Check grain moisture (20-25% for harvest)',
          'Dry to 12-14% moisture for storage',
          'Shell and store in dry place',
        ],
        tips: [
          'Physiological maturity: black layer at grain base',
          'Delay reduces quality',
          'Proper drying prevents fungal growth',
        ],
      },
    ],
  },
  wheat: {
    totalDuration: 120,
    stages: [
      {
        name: 'Land Preparation',
        dayRange: 'Day 1-10',
        days: { start: 1, end: 10 },
        icon: '🚜',
        activities: [
          'Deep summer plowing',
          'Apply farmyard manure (10 tons/hectare)',
          '2-3 harrowings for fine tilth',
          'Level field with laser leveler',
        ],
        tips: ['Good tilth ensures uniform germination', 'Remove weeds completely'],
      },
      {
        name: 'Sowing',
        dayRange: 'Day 11-15',
        days: { start: 11, end: 15 },
        icon: '🌱',
        activities: [
          'Treat seeds with fungicide',
          'Sow at 5 cm depth using seed drill',
          'Maintain row spacing of 20-23 cm',
          'Use seed rate of 100 kg/hectare',
          'Apply basal dose of fertilizers',
        ],
        tips: ['Timely sowing is crucial', 'Use certified seeds', 'Sow in lines for better management'],
      },
      {
        name: 'Germination & Crown Root Initiation',
        dayRange: 'Day 16-30',
        days: { start: 16, end: 30 },
        icon: '🌿',
        activities: [
          'First irrigation at 20-25 days (Crown Root Stage)',
          'Monitor germination percentage',
          'Apply herbicide for weed control if needed',
        ],
        tips: [
          'Crown root stage irrigation is critical',
          'Controls weeds early',
          'Ensures good plant establishment',
        ],
        warnings: ['Missing CRI irrigation reduces yield significantly'],
      },
      {
        name: 'Tillering',
        dayRange: 'Day 31-60',
        days: { start: 31, end: 60 },
        icon: '🌾',
        activities: [
          'Second irrigation at 40-45 days',
          'Apply first nitrogen top dressing after first irrigation',
          'Manual weeding if needed',
          'Monitor for aphids and termites',
        ],
        tips: ['More tillers = higher yield', 'Adequate nitrogen crucial', 'Maintain soil moisture'],
      },
      {
        name: 'Jointing & Booting',
        dayRange: 'Day 61-80',
        days: { start: 61, end: 80 },
        icon: '🌾',
        activities: [
          'Third irrigation at jointing stage (60 days)',
          'Apply second nitrogen top dressing',
          'Fourth irrigation at booting stage (75 days)',
          'Control rust disease if appears',
        ],
        tips: [
          'Stem elongation happens rapidly',
          'Never skip these irrigations',
          'Scout for yellow rust',
        ],
      },
      {
        name: 'Heading & Flowering',
        dayRange: 'Day 81-95',
        days: { start: 81, end: 95 },
        icon: '🌾',
        activities: [
          'Fifth irrigation at heading stage',
          'Monitor for loose smut',
          'Control aphids if population high',
          'Avoid water stress',
        ],
        tips: ['Flowering determines grain number', 'Good moisture essential', 'Protect from birds'],
        warnings: ['Most sensitive to water stress'],
      },
      {
        name: 'Grain Filling',
        dayRange: 'Day 96-110',
        days: { start: 96, end: 110 },
        icon: '🌾',
        activities: [
          'Sixth irrigation at milking stage',
          'Final irrigation at dough stage',
          'Monitor for grain aphids',
          'Protect from birds and rats',
        ],
        tips: ['Grain weight determined now', 'Adequate water = plump grains', 'Use bird scarers'],
      },
      {
        name: 'Maturity & Harvest',
        dayRange: 'Day 111-120',
        days: { start: 111, end: 120 },
        icon: '🌾',
        activities: [
          'Stop irrigation 10-12 days before harvest',
          'Harvest when grains are hard (12-14% moisture)',
          'Use combine harvester or manual harvesting',
          'Thresh immediately',
          'Dry and store properly',
        ],
        tips: [
          'Harvest at physiological maturity',
          'Grains should not break between teeth',
          'Delay causes shattering losses',
        ],
      },
    ],
  },
  cotton: {
    totalDuration: 150,
    stages: [
      {
        name: 'Land Preparation',
        dayRange: 'Day 1-10',
        days: { start: 1, end: 10 },
        icon: '🚜',
        activities: [
          'Deep plowing to 20-25 cm',
          'Apply farmyard manure (10 tons/hectare)',
          '2-3 harrowings for fine tilth',
          'Create ridges and furrows',
        ],
        tips: ['Cotton needs well-drained soil', 'Deep plowing improves root growth'],
      },
      {
        name: 'Sowing',
        dayRange: 'Day 11-15',
        days: { start: 11, end: 15 },
        icon: '🌱',
        activities: [
          'Treat seeds with fungicide and insecticide',
          'Sow on ridges at 3-5 cm depth',
          'Maintain spacing of 60-75 cm × 30 cm',
          'Apply basal fertilizers',
        ],
        tips: ['Use Bt cotton for bollworm resistance', 'Ensure good seed-soil contact'],
      },
      {
        name: 'Germination & Early Growth',
        dayRange: 'Day 16-35',
        days: { start: 16, end: 35 },
        icon: '🌿',
        activities: [
          'Gap filling within 10 days',
          'Thinning to maintain plant population',
          'First irrigation after 20-25 days',
          'Monitor for sucking pests (jassids, aphids)',
        ],
        tips: ['Maintain 1-2 plants per hill', 'Early pest control is crucial'],
        warnings: ['Jassids can damage young plants severely'],
      },
      {
        name: 'Vegetative Growth',
        dayRange: 'Day 36-60',
        days: { start: 36, end: 60 },
        icon: '🌿',
        activities: [
          'Apply first nitrogen top dressing',
          'Second and third irrigation at 15-day intervals',
          'First hoeing and earthing up',
          'Control thrips and whiteflies',
        ],
        tips: ['Rapid growth phase', 'Good vegetative growth ensures more bolls', 'Monitor leaf curl virus'],
      },
      {
        name: 'Square Formation',
        dayRange: 'Day 61-80',
        days: { start: 61, end: 80 },
        icon: '🌸',
        activities: [
          'Regular irrigation (10-15 day intervals)',
          'Apply second nitrogen dose',
          'Remove unwanted vegetative branches',
          'Monitor for pink bollworm and spotted bollworm',
        ],
        tips: [
          'Squares are flower buds',
          'Square shedding should be <10%',
          'Maintain adequate moisture',
        ],
      },
      {
        name: 'Flowering & Boll Formation',
        dayRange: 'Day 81-120',
        days: { start: 81, end: 120 },
        icon: '🌸',
        activities: [
          'Continue regular irrigation',
          'Monitor boll retention',
          'Control bollworm complex aggressively',
          'Remove damaged bolls',
          'Spray for boll rot if high humidity',
        ],
        tips: [
          'Peak flowering at 90-100 days',
          'Good boll set = good yield',
          'Avoid water stress',
        ],
        warnings: ['Most critical for yield - protect bolls at all cost'],
      },
      {
        name: 'Boll Development',
        dayRange: 'Day 121-140',
        days: { start: 121, end: 140 },
        icon: '☁️',
        activities: [
          'Continue irrigation',
          'Monitor for grey weevil',
          'Prevent boll shedding',
          'Watch for boll rot disease',
        ],
        tips: ['Bolls mature in 45-60 days after flowering', 'Ensure adequate moisture'],
      },
      {
        name: 'Boll Opening & Harvest',
        dayRange: 'Day 141-180',
        days: { start: 141, end: 180 },
        icon: '☁️',
        activities: [
          'Stop irrigation 15-20 days before first picking',
          'First picking when 60% bolls opened',
          'Pick at 10-15 day intervals (3-4 pickings)',
          'Pick only fully opened bolls',
          'Sun dry and store in dry place',
        ],
        tips: [
          'Hand picking ensures quality',
          'Pick in morning after dew dries',
          'Avoid mixing grades',
        ],
      },
    ],
  },
  // Default generic crop care for crops not specifically listed
  default: {
    totalDuration: 90,
    stages: [
      {
        name: 'Land Preparation',
        dayRange: 'Day 1-7',
        days: { start: 1, end: 7 },
        icon: '🚜',
        activities: [
          'Plow the field thoroughly',
          'Apply organic manure',
          'Level the field properly',
          'Create proper drainage system',
        ],
        tips: ['Test soil before planting', 'Remove weeds and debris'],
      },
      {
        name: 'Sowing/Planting',
        dayRange: 'Day 8-14',
        days: { start: 8, end: 14 },
        icon: '🌱',
        activities: [
          'Treat seeds if needed',
          'Sow at recommended depth and spacing',
          'Apply basal fertilizers',
          'Ensure adequate moisture',
        ],
        tips: ['Use quality seeds', 'Sow at right time', 'Maintain proper spacing'],
      },
      {
        name: 'Early Growth',
        dayRange: 'Day 15-35',
        days: { start: 15, end: 35 },
        icon: '🌿',
        activities: [
          'Gap filling if needed',
          'First irrigation',
          'Weed control',
          'Monitor for pests',
        ],
        tips: ['Ensure good plant establishment', 'Control weeds early'],
      },
      {
        name: 'Vegetative Growth',
        dayRange: 'Day 36-60',
        days: { start: 36, end: 60 },
        icon: '🌿',
        activities: [
          'Apply first top dressing',
          'Regular irrigation',
          'Second weeding',
          'Pest and disease management',
        ],
        tips: ['Monitor plant health regularly', 'Ensure adequate nutrition'],
      },
      {
        name: 'Reproductive Phase',
        dayRange: 'Day 61-75',
        days: { start: 61, end: 75 },
        icon: '🌸',
        activities: [
          'Maintain adequate moisture',
          'Apply second top dressing if needed',
          'Monitor for pests and diseases',
          'Protect from birds if needed',
        ],
        tips: ['Critical stage for yield', 'Never allow water stress'],
      },
      {
        name: 'Maturity & Harvest',
        dayRange: 'Day 76-90',
        days: { start: 76, end: 90 },
        icon: '🌾',
        activities: [
          'Stop irrigation before harvest',
          'Harvest at right maturity',
          'Proper drying if needed',
          'Clean storage',
        ],
        tips: ['Timely harvest is important', 'Proper storage prevents losses'],
      },
    ],
  },
};

// Helper function to get current stage based on days since planting
export function getCurrentStage(cropName: string, daysSincePlanting: number): CareStage | null {
  const cropKey = cropName.toLowerCase();
  const careData = cropCareData[cropKey] || cropCareData.default;
  
  const currentStage = careData.stages.find(
    stage => daysSincePlanting >= stage.days.start && daysSincePlanting <= stage.days.end
  );
  
  return currentStage || null;
}

// Helper function to get next stage
export function getNextStage(cropName: string, daysSincePlanting: number): CareStage | null {
  const cropKey = cropName.toLowerCase();
  const careData = cropCareData[cropKey] || cropCareData.default;
  
  const nextStage = careData.stages.find(
    stage => daysSincePlanting < stage.days.start
  );
  
  return nextStage || null;
}

// Helper function to get all stages for a crop
export function getAllStages(cropName: string): CareStage[] {
  const cropKey = cropName.toLowerCase();
  const careData = cropCareData[cropKey] || cropCareData.default;
  return careData.stages;
}

// Helper function to calculate days remaining to harvest
export function getDaysToHarvest(cropName: string, daysSincePlanting: number): number {
  const cropKey = cropName.toLowerCase();
  const careData = cropCareData[cropKey] || cropCareData.default;
  return Math.max(0, careData.totalDuration - daysSincePlanting);
}
