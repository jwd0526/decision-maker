#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

// Simple CLI arguments parsing without dependencies
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    // Handle --key=value format
    if (argv[i].includes('=')) {
      const parts = argv[i].split('=');
      const key = parts[0].replace(/^--/, '');
      args[key] = parts[1];
      continue;
    }
    
    // Handle --key value format
    if (argv[i].startsWith('--')) {
      const key = argv[i].replace(/^--/, '');
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i++; // Skip the next item since we used it as a value
    }
  }
  
  // Convert numeric values
  if (args.radius) args.radius = parseFloat(args.radius);
  if (args['price-level']) args['price-level'] = parseInt(args['price-level'], 10);
  
  return args;
}

const argv = parseArgs();

// Check for required arguments
if (!argv.zipcode) {
  console.error('Error: --zipcode argument is required');
  process.exit(1);
}

if (!argv.radius) {
  console.error('Error: --radius argument is required');
  process.exit(1);
}

console.log("Command line arguments:", argv);

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Get the Google Places API key from environment
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (!apiKey) {
  console.error('Error: Google Places API key not found. Please set the GOOGLE_PLACES_API_KEY environment variable.');
  process.exit(1);
}

// Helper function for Haversine distance calculation
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Radius of the Earth in miles
  const R = 3958.8;
  
  // Convert latitude and longitude from degrees to radians
  const lat1Rad = degreesToRadians(lat1);
  const lon1Rad = degreesToRadians(lon1);
  const lat2Rad = degreesToRadians(lat2);
  const lon2Rad = degreesToRadians(lon2);
  
  // Haversine formula
  const dlon = lon2Rad - lon1Rad;
  const dlat = lat2Rad - lat1Rad;
  const a = Math.sin(dlat/2) ** 2 + 
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dlon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

// Validate price level
function validatePriceLevel(priceLevelInput) {
  if (priceLevelInput === undefined || priceLevelInput === null) {
    console.log('No price level provided, will show all price levels');
    return null;
  }
  
  try {
    // Handle string input if needed
    if (typeof priceLevelInput === 'string' && priceLevelInput.trim()) {
      // Check if it's a dollar sign format
      if ([...priceLevelInput].every(c => c === '$')) {
        const count = priceLevelInput.length;
        return (count >= 1 && count <= 5) ? count - 1 : null;
      }
      // Otherwise try to convert to integer
      priceLevelInput = priceLevelInput.trim();
    }
    
    // Convert to int and validate range
    const priceLevel = parseInt(priceLevelInput, 10);
    if (priceLevel >= 0 && priceLevel <= 4) {
      console.log(`Using price level: ${priceLevel} (0-4 scale)`);
      return priceLevel;
    } else {
      console.log(`Invalid price level: ${priceLevelInput}. Must be 0-4.`);
      return null;
    }
  } catch (e) {
    console.log(`Error parsing price level '${priceLevelInput}': ${e.message}`);
    console.log('Must be an integer 0-4.');
    return null;
  }
}

// Get coordinates from zipcode
async function getCoordinatesFromZipcode(apiKey, zipcode) {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipcode}&key=${apiKey}`;
  
  try {
    const results = await makeRequest(geocodeUrl);
    if (results.status === 'OK' && results.results.length > 0) {
      const location = results.results[0].geometry.location;
      return [location.lat, location.lng];
    }
  } catch (error) {
    console.error(`Error in geocoding request: ${error.message}`);
  }
  
  console.error(`Error: Could not convert zipcode ${zipcode} to coordinates.`);
  return [null, null];
}

// Get current time at location
async function getCurrentTime(locationLat, locationLng, apiKey) {
  const timestamp = Math.floor(Date.now() / 1000);
  const timezoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${locationLat},${locationLng}&timestamp=${timestamp}&key=${apiKey}`;
  
  try {
    const timezoneData = await makeRequest(timezoneUrl);
    if (timezoneData.status === 'OK') {
      const timezoneId = timezoneData.timeZoneId;
      
      // JavaScript doesn't have direct timezone manipulation like pytz
      // So we'll use the offset information instead
      const offset = timezoneData.rawOffset + timezoneData.dstOffset;
      const localTime = new Date(new Date().getTime() + offset * 1000);
      return localTime;
    }
  } catch (error) {
    console.error(`Error getting timezone: ${error.message}`);
  }
  
  return new Date(); // Fallback to system time
}

// Check if a restaurant is currently open
async function isRestaurantOpen(placeId, apiKey) {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${apiKey}`;
  
  try {
    const details = await makeRequest(detailsUrl);
    if (details.status === 'OK' && details.result) {
      if (details.result.opening_hours) {
        if ('open_now' in details.result.opening_hours) {
          return details.result.opening_hours.open_now;
        }
      }
    }
  } catch (error) {
    console.error(`Error checking if restaurant is open: ${error.message}`);
  }
  
  return true; // If we can't determine if it's open, we'll assume it is
}

// Find open restaurants
async function findOpenRestaurants(apiKey, zipcode, radiusMiles, searchTerm = null, priceLevel = null) {
  // Convert zipcode to coordinates
  const [lat, lng] = await getCoordinatesFromZipcode(apiKey, zipcode);
  if (!lat || !lng) {
    return [];
  }
  
  // Convert radius from miles to meters (required by Google Places API)
  const radiusMeters = radiusMiles * 1609.34;
  
  // Get local time for the location
  const localTime = await getCurrentTime(lat, lng, apiKey);
  console.log(`Local time at ${zipcode}: ${localTime.toISOString()}`);
  
  // Build the URL for the Places API
  let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=restaurant`;
  
  // Add search term if provided
  if (searchTerm) {
    nearbyUrl += `&keyword=${encodeURIComponent(searchTerm)}`;
  }
  
  // Add price level if provided
  if (priceLevel !== null) {
    nearbyUrl += `&minprice=${priceLevel}&maxprice=${priceLevel}`;
  }
  
  // Add API key
  nearbyUrl += `&key=${apiKey}`;
  
  const restaurants = [];
  let pageCount = 0;
  const maxPages = 3;  // Limit to 3 pages (60 results) for API usage reasons
  
  while (nearbyUrl && pageCount < maxPages) {
    pageCount++;
    
    try {
      const results = await makeRequest(nearbyUrl);
      
      if (results.status !== 'OK') {
        console.error(`Error: API returned status ${results.status}`);
        if (results.error_message) {
          console.error(`Error message: ${results.error_message}`);
        }
        break;
      }
      
      for (const place of results.results) {
        // Calculate actual distance
        const placeLat = place.geometry.location.lat;
        const placeLng = place.geometry.location.lng;
        const distance = calculateDistance(lat, lng, placeLat, placeLng);
        
        // Check if restaurant is currently open
        const isOpen = await isRestaurantOpen(place.place_id, apiKey);
        
        if (isOpen) {
          // Get the price level (numeric 0-4 value from Google API)
          const priceLevelNumeric = place.price_level !== undefined ? place.price_level : null;
          
          const restaurantInfo = {
            name: place.name,
            address: place.vicinity || 'Address not available',
            distance_miles: parseFloat(distance.toFixed(2)),
            rating: place.rating || 'No rating',
            user_ratings_total: place.user_ratings_total || 0,
            price_level_numeric: priceLevelNumeric,
            place_id: place.place_id,
            types: place.types || []
          };
          
          // Convert price_level from number to $ symbols
          if (priceLevelNumeric !== null) {
            // Google API uses 0-4, but we want to display as $-$$$$
            // where $ is the cheapest (1) and $$$$ is the most expensive (4)
            const priceLevelDisplay = priceLevelNumeric >= 0 && priceLevelNumeric <= 3 
              ? '$'.repeat(priceLevelNumeric + 1) 
              : '$$$$';
            restaurantInfo.price_level = priceLevelDisplay;
          } else {
            restaurantInfo.price_level = 'Price not available';
          }
          
          restaurants.push(restaurantInfo);
        }
      }
      
      // Check for next page of results
      if (results.next_page_token) {
        nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${results.next_page_token}&key=${apiKey}`;
        // Google requires a short delay before using the next_page_token
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        nearbyUrl = null;
      }
      
    } catch (error) {
      console.error(`Error in restaurants API request: ${error.message}`);
      break;
    }
  }
  
  // Sort restaurants by distance
  restaurants.sort((a, b) => a.distance_miles - b.distance_miles);
  
  return restaurants;
}

// Export to JSON file
function exportToJSON(data, filename) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 4), 'utf8');
    console.log(`Data successfully exported to ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error exporting data to JSON: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log(`Raw price level arg: ${argv['price-level']}, Type: ${typeof argv['price-level']}`);
  const priceLevel = validatePriceLevel(argv['price-level']);
  console.log(`Validated price level: ${priceLevel}`);
  
  // Print search parameters
  console.log(`Searching for open restaurants in ${argv.zipcode}`);
  console.log(`Radius: ${argv.radius} miles`);
  if (argv.search) {
    console.log(`Cuisine/Type: ${argv.search}`);
  }
  
  // Find restaurants
  const restaurants = await findOpenRestaurants(
    apiKey,
    argv.zipcode,
    argv.radius,
    argv.search || null,
    priceLevel
  );
  
  if (!restaurants || restaurants.length === 0) {
    console.log('No open restaurants found matching your criteria.');
    process.exit(0);
  }
  
  console.log(`Found ${restaurants.length} open restaurants.`);
  
  // Create search terms for filename
  const searchTerm = argv.search ? argv.search.replace(/ /g, '_') : 'all';
  const priceTerm = argv['price-level'] !== undefined ? `price_${argv['price-level']}` : 'any_price';
  
  // Create output data structure with metadata
  const outputData = {
    metadata: {
      zipcode: argv.zipcode,
      radius_miles: argv.radius,
      search_term: argv.search || null,
      price_level: argv['price-level'],
      total_restaurants: restaurants.length,
      timestamp: new Date().toISOString(),
    },
    restaurants: restaurants
  };
  
  // Export to JSON file
  const filename = 'results.json';
  if (exportToJSON(outputData, filename)) {
    console.log(`Restaurant data exported to ${filename}`);
    
    // Display a sample of the results
    const sampleSize = Math.min(5, restaurants.length);
    console.log(`\nShowing ${sampleSize} of ${restaurants.length} restaurants found:`);
    console.log('-'.repeat(80));
    
    for (let i = 0; i < sampleSize; i++) {
      const restaurant = restaurants[i];
      console.log(`${i + 1}. ${restaurant.name}`);
      console.log(`   Address: ${restaurant.address}`);
      console.log(`   Distance: ${restaurant.distance_miles} miles`);
      console.log(`   Rating: ${restaurant.rating}/5.0 (${restaurant.user_ratings_total} reviews)`);
      console.log(`   Price: ${restaurant.price_level}`);
      console.log(`   Categories: ${restaurant.types.slice(0, 3).join(', ')}`);  // Show top 3 categories
      console.log('-'.repeat(80));
    }
    
    console.log(`Full results available in ${filename}`);
  }
}

// Run the main function
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});