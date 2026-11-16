// Curated appetizing food images specifically matched to restaurants and their cuisines.
// Only used for restaurants to give diners a mouth-watering visual preview of the food.

const RESTAURANT_IMAGES_BY_NAME = {
  'ravi dosa corner': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80', // Golden crispy Masala Dosa with chutneys & sambar
  "meena's kitchen": 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80',  // Rich Paneer Butter Masala curry
};

const CUISINE_IMAGES = {
  'south indian': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
  'dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
  'north indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',
  'curry': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',
  'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
  'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
  'italian': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
  'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  'fast food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  'chinese': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80',
  'asian': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80',
  'dessert': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
  'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
  'cafe': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
  'coffee': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
};

// General high-quality gourmet food fallback
const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80';

export function getRestaurantImage(restaurant) {
  if (!restaurant) return DEFAULT_FOOD_IMAGE;
  const name = (restaurant.restaurant_name || restaurant.name || '').toLowerCase().trim();
  if (RESTAURANT_IMAGES_BY_NAME[name]) {
    return RESTAURANT_IMAGES_BY_NAME[name];
  }
  const cuisine = (restaurant.cuisine_type || '').toLowerCase().trim();
  for (const [key, url] of Object.entries(CUISINE_IMAGES)) {
    if (cuisine.includes(key) || name.includes(key)) {
      return url;
    }
  }
  return DEFAULT_FOOD_IMAGE;
}
