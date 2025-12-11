// Database table definitions and schemas
export interface TableInfo {
  name: string;
  displayName: string;
  description: string;
  columns: string[];
  icon?: string;
  category: 'users' | 'crops' | 'marketplace' | 'government' | 'support' | 'ai' | 'auth';
  rowCount?: number;
}

export const DATABASE_TABLES: TableInfo[] = [
  // Users & Auth
  {
    name: 'users',
    displayName: 'Users',
    description: 'Core user accounts and authentication data',
    category: 'users',
    columns: ['id', 'email', 'display_name', 'phone', 'role', 'created_at', 'updated_at', 'email_verified', 'phone_verified']
  },
  {
    name: 'user_profiles',
    displayName: 'User Profiles',
    description: 'Extended user profile information',
    category: 'users',
    columns: ['user_id', 'full_name', 'phone_number', 'state', 'district', 'farm_size', 'farming_type', 'created_at', 'updated_at']
  },
  {
    name: 'email_verification_tokens',
    displayName: 'Email Verification',
    description: 'Email verification tokens for signup process',
    category: 'auth',
    columns: ['id', 'user_id', 'token_hash', 'lookup_hash', 'expires_at', 'created_at']
  },
  {
    name: 'password_reset_tokens',
    displayName: 'Password Reset Tokens',
    description: 'Password reset tokens for account recovery',
    category: 'auth',
    columns: ['id', 'user_id', 'token_hash', 'lookup_hash', 'expires_at', 'created_at']
  },
  {
    name: 'magic_link_tokens',
    displayName: 'Magic Link Tokens',
    description: 'Magic link authentication tokens',
    category: 'auth',
    columns: ['id', 'email', 'token_hash', 'lookup_hash', 'redirect_url', 'expires_at', 'created_at']
  },

  // Crops
  {
    name: 'crops',
    displayName: 'Crops',
    description: 'Crop database with optimal conditions and information',
    category: 'crops',
    columns: ['id', 'name', 'scientific_name', 'description', 'optimal_n', 'optimal_p', 'optimal_k', 'optimal_temp', 'optimal_humidity', 'optimal_rainfall', 'optimal_ph', 'suitable_soil_types', 'season', 'market_price']
  },
  {
    name: 'crop_recommendations',
    displayName: 'Crop Recommendations',
    description: 'AI-generated crop recommendations for users',
    category: 'ai',
    columns: ['id', 'user_id', 'crop_id', 'nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'rainfall', 'ph_value', 'soil_type', 'latitude', 'longitude', 'location_name', 'confidence_score', 'recommended_crops', 'created_at']
  },
  {
    name: 'price_predictions',
    displayName: 'Price Predictions',
    description: 'ML-based crop price predictions',
    category: 'ai',
    columns: ['id', 'user_id', 'crop_id', 'predicted_price', 'current_price', 'prediction_date', 'factors', 'created_at']
  },
  {
    name: 'disease_predictions',
    displayName: 'Disease Predictions',
    description: 'AI-detected crop diseases and treatments',
    category: 'ai',
    columns: ['id', 'user_id', 'crop_name', 'disease_name', 'confidence', 'symptoms', 'treatment', 'image_url', 'created_at']
  },

  // Marketplace
  {
    name: 'crop_listings',
    displayName: 'Crop Listings',
    description: 'Farmer crop listings for marketplace',
    category: 'marketplace',
    columns: ['id', 'user_id', 'seller_name', 'seller_phone', 'seller_location', 'crop_name', 'quantity', 'unit', 'price_per_unit', 'total_price', 'description', 'image_url', 'status', 'created_at']
  },
  {
    name: 'crop_offers',
    displayName: 'Crop Offers',
    description: 'Buyer offers on crop listings',
    category: 'marketplace',
    columns: ['id', 'listing_id', 'buyer_id', 'buyer_name', 'buyer_phone', 'offered_price', 'quantity', 'message', 'status', 'created_at', 'updated_at']
  },
  {
    name: 'orders',
    displayName: 'Orders',
    description: 'Customer orders from marketplace',
    category: 'marketplace',
    columns: ['id', 'user_id', 'order_number', 'buyer_name', 'buyer_phone', 'delivery_address', 'payment_method', 'payment_status', 'delivery_status', 'total_amount', 'notes', 'created_at', 'updated_at']
  },
  {
    name: 'order_items',
    displayName: 'Order Items',
    description: 'Individual items in customer orders',
    category: 'marketplace',
    columns: ['id', 'order_id', 'listing_id', 'crop_name', 'quantity', 'unit', 'price_per_unit', 'total_price', 'seller_name', 'seller_phone', 'seller_location', 'created_at']
  },
  {
    name: 'marketplace_transactions',
    displayName: 'Marketplace Transactions',
    description: 'Transaction records for marketplace activities',
    category: 'marketplace',
    columns: ['id', 'listing_id', 'seller_id', 'buyer_id', 'crop_name', 'quantity', 'price_per_unit', 'total_amount', 'transaction_date', 'payment_status', 'delivery_status']
  },

  // Government & Support
  {
    name: 'government_schemes',
    displayName: 'Government Schemes',
    description: 'Agricultural schemes and subsidies information',
    category: 'government',
    columns: ['id', 'title', 'description', 'eligibility', 'benefits', 'how_to_apply', 'deadline', 'state', 'category', 'official_link', 'is_active', 'created_at', 'updated_at']
  },
  {
    name: 'newsletters',
    displayName: 'Newsletters',
    description: 'Agriculture newsletters and news for farmers',
    category: 'government',
    columns: ['id', 'title', 'content', 'excerpt', 'image_url', 'category', 'author', 'published_date', 'is_published', 'created_at', 'updated_at']
  },
  {
    name: 'support_tickets',
    displayName: 'Support Tickets',
    description: 'User support requests and issue tracking',
    category: 'support',
    columns: ['id', 'user_id', 'subject', 'message', 'status', 'priority', 'admin_response', 'created_at', 'updated_at']
  },
  {
    name: 'chatbot_conversations',
    displayName: 'Chatbot Conversations',
    description: 'Chatbot interaction history with users',
    category: 'support',
    columns: ['id', 'user_id', 'message', 'response', 'created_at']
  }
];

export const getTablesByCategory = (category: string): TableInfo[] => {
  return DATABASE_TABLES.filter(table => table.category === category);
};

export const getTableByName = (name: string): TableInfo | undefined => {
  return DATABASE_TABLES.find(table => table.name === name);
};

export const TABLE_CATEGORIES = {
  users: { label: 'Users & Profiles', color: 'bg-blue-100 text-blue-700' },
  auth: { label: 'Authentication', color: 'bg-purple-100 text-purple-700' },
  crops: { label: 'Crops', color: 'bg-green-100 text-green-700' },
  ai: { label: 'AI & Predictions', color: 'bg-orange-100 text-orange-700' },
  marketplace: { label: 'Marketplace', color: 'bg-pink-100 text-pink-700' },
  government: { label: 'Government & News', color: 'bg-yellow-100 text-yellow-700' },
  support: { label: 'Support & Chat', color: 'bg-red-100 text-red-700' }
};
