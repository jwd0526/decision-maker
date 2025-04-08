import { NextResponse } from 'next/server';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(request) {
  try {
    const { mealType, category, zipCode, priceLevel, searchRadius } = await request.json();
    
    // Convert price level to Google API format (0-3)
    // Our UI uses 1-4, Google API uses 0-3
    const googlePriceLevel = priceLevel - 1;

    // Check if the GOOGLE_PLACES_API_KEY environment variable is set
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("GOOGLE_PLACES_API_KEY environment variable is not set. Using mock data.");
      const mockRestaurants = getMockRestaurants(mealType, category, zipCode, priceLevel);
      return NextResponse.json({ restaurants: mockRestaurants });
    }
    
    // Build the command with environment variable
    const scriptPath = path.join(process.cwd(), 'food-finder', 'food-finder.js');
    // Make sure the script writes to the root directory's results.json
    const command = `GOOGLE_PLACES_API_KEY="${apiKey}" node ${scriptPath} --zipcode ${zipCode} --radius ${searchRadius} --search ${category.toLowerCase()} --price-level ${googlePriceLevel} && mv ${path.join(process.cwd(), 'food-finder', 'results.json')} ${path.join(process.cwd(), 'results.json')} 2>/dev/null || true`;
    
    console.log(`Executing command: ${command}`);
    
    // Execute the Python script
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Script error: ${stderr}`);
    }
    
    console.log(`Python script output: ${stdout}`);
    
    // Read the results from the JSON file in the root directory
    const resultsPath = path.join(process.cwd(), 'results.json');
    const jsonData = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(jsonData);
    
    // Pull out just the restaurant data
    const restaurants = results.restaurants.map(restaurant => ({
      id: restaurant.place_id,
      name: restaurant.name,
      address: restaurant.address,
      priceRange: restaurant.price_level,
      price_level_numeric: restaurant.price_level_numeric,
      rating: restaurant.rating,
      distance: restaurant.distance_miles,
      isOpen: true, // The Python script already filters for open restaurants
    }));

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return mock data as fallback
    const mockRestaurants = getMockRestaurants(mealType, category, zipCode, priceLevel);
    return NextResponse.json({ restaurants: mockRestaurants });
  }
}

// Fallback mock data function
function getMockRestaurants(mealType, category, zipCode, priceLevel) {
  console.log('Using mock data as fallback');
  console.log(`Price level filter: ${priceLevel}`);
  
  const mockCategories = {
    "Diner": ["breakfast", "lunch"],
    "Pancakes": ["breakfast"],
    "Eggs": ["breakfast"],
    "Bagels": ["breakfast"],
    "Coffee Shop": ["breakfast"],
    "Tacos": ["lunch", "dinner"],
    "Pizza": ["lunch", "dinner"],
    "Sandwiches": ["lunch"],
    "Salads": ["lunch"],
    "Fast Food": ["lunch", "dinner"],
    "Italian": ["dinner"],
    "Mexican": ["dinner"],
    "Chinese": ["dinner"],
    "Thai": ["dinner"],
    "Indian": ["dinner"],
    "American": ["lunch", "dinner"],
    "Japanese": ["dinner"]
  };

  // Mock data with price levels 1-4 ($ to $$$$)
  const mockRestaurants = [
    {
      id: "mock-1",
      name: "Joe's Diner",
      category: "Diner",
      mealTypes: ["breakfast", "lunch"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `123 Main St, ${zipCode}`,
      isOpen: true,
      distance: 1.5,
      rating: 4.2
    },
    {
      id: "mock-2",
      name: "Pancake Palace",
      category: "Pancakes",
      mealTypes: ["breakfast"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `456 Maple Ave, ${zipCode}`,
      isOpen: true,
      distance: 2.3,
      rating: 4.5
    },
    {
      id: "mock-3",
      name: "Taco Town",
      category: "Tacos",
      mealTypes: ["lunch", "dinner"],
      priceRange: "$",
      price_level_numeric: 1,
      address: `789 Oak St, ${zipCode}`,
      isOpen: true,
      distance: 0.8,
      rating: 4.7
    },
    {
      id: "mock-4",
      name: "Pizza Planet",
      category: "Pizza",
      mealTypes: ["lunch", "dinner"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `101 Pine Rd, ${zipCode}`,
      isOpen: true,
      distance: 3.1,
      rating: 4.0
    },
    {
      id: "mock-5",
      name: "Thai Delight",
      category: "Thai",
      mealTypes: ["dinner"],
      priceRange: "$$$",
      price_level_numeric: 3,
      address: `202 Cedar Blvd, ${zipCode}`,
      isOpen: true,
      distance: 4.2,
      rating: 4.8
    },
    {
      id: "mock-6",
      name: "Morning Eggs",
      category: "Eggs",
      mealTypes: ["breakfast"],
      priceRange: "$",
      price_level_numeric: 1,
      address: `303 Breakfast Ave, ${zipCode}`,
      isOpen: true,
      distance: 1.2,
      rating: 4.3
    },
    {
      id: "mock-7",
      name: "Bagel Bros",
      category: "Bagels",
      mealTypes: ["breakfast"],
      priceRange: "$",
      price_level_numeric: 1,
      address: `404 Morning St, ${zipCode}`,
      isOpen: true,
      distance: 0.9,
      rating: 4.1
    },
    {
      id: "mock-8",
      name: "Coffee Corner",
      category: "Coffee Shop",
      mealTypes: ["breakfast"],
      priceRange: "$",
      price_level_numeric: 1,
      address: `505 Bean Blvd, ${zipCode}`,
      isOpen: true,
      distance: 1.7,
      rating: 4.4
    },
    {
      id: "mock-9",
      name: "Sandwich Spot",
      category: "Sandwiches",
      mealTypes: ["lunch"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `606 Lunch Lane, ${zipCode}`,
      isOpen: true,
      distance: 2.1,
      rating: 4.0
    },
    {
      id: "mock-10",
      name: "Salad Station",
      category: "Salads",
      mealTypes: ["lunch"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `707 Healthy Rd, ${zipCode}`,
      isOpen: true,
      distance: 1.8,
      rating: 4.2
    },
    {
      id: "mock-11",
      name: "Burger Barn",
      category: "Fast Food",
      mealTypes: ["lunch", "dinner"],
      priceRange: "$",
      price_level_numeric: 1,
      address: `808 Quick St, ${zipCode}`,
      isOpen: true,
      distance: 1.3,
      rating: 3.9
    },
    {
      id: "mock-12",
      name: "Pasta Place",
      category: "Italian",
      mealTypes: ["dinner"],
      priceRange: "$$$",
      price_level_numeric: 3,
      address: `909 Italy Ave, ${zipCode}`,
      isOpen: true,
      distance: 3.4,
      rating: 4.6
    },
    {
      id: "mock-13",
      name: "Taqueria Delicious",
      category: "Mexican",
      mealTypes: ["dinner"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `1010 Mexico Blvd, ${zipCode}`,
      isOpen: true,
      distance: 2.9,
      rating: 4.3
    },
    {
      id: "mock-14",
      name: "Wok & Roll",
      category: "Chinese",
      mealTypes: ["dinner"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `1111 China St, ${zipCode}`,
      isOpen: true,
      distance: 3.7,
      rating: 4.4
    },
    {
      id: "mock-15",
      name: "All-American Grill",
      category: "American",
      mealTypes: ["lunch", "dinner"],
      priceRange: "$$$",
      price_level_numeric: 3,
      address: `1212 USA Ave, ${zipCode}`,
      isOpen: true,
      distance: 2.4,
      rating: 4.1
    },
    {
      id: "mock-16",
      name: "Sushi Supreme",
      category: "Japanese",
      mealTypes: ["dinner"],
      priceRange: "$$$",
      price_level_numeric: 3,
      address: `1313 Japan Blvd, ${zipCode}`,
      isOpen: true,
      distance: 4.1,
      rating: 4.7
    },
    {
      id: "mock-17",
      name: "Curry Kitchen",
      category: "Indian",
      mealTypes: ["dinner"],
      priceRange: "$$",
      price_level_numeric: 2,
      address: `1414 India St, ${zipCode}`,
      isOpen: true,
      distance: 3.8,
      rating: 4.5
    },
    {
      id: "mock-18",
      name: "Luxury Dining",
      category: "American",
      mealTypes: ["dinner"],
      priceRange: "$$$$",
      price_level_numeric: 4,
      address: `1515 Expensive Ave, ${zipCode}`,
      isOpen: true,
      distance: 5.2,
      rating: 4.9
    }
  ];

  // Filter restaurants based on user criteria
  return mockRestaurants.filter(restaurant => {
    const matchesMeal = restaurant.mealTypes.includes(mealType);
    const matchesCategory = restaurant.category === category;
    const matchesPrice = priceLevel ? restaurant.price_level_numeric === priceLevel : true;
    return matchesMeal && matchesCategory && matchesPrice;
  });
}