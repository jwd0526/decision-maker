import requests
import json
import time
from math import radians, sin, cos, sqrt, atan2
import os
from datetime import datetime
import pytz
import argparse
import sys

def get_coordinates_from_zipcode(api_key, zipcode):
    """Convert a zipcode to latitude and longitude coordinates."""
    geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={zipcode}&key={api_key}"
    response = requests.get(geocode_url)
    if response.status_code == 200:
        results = response.json()
        if results["status"] == "OK" and results["results"]:
            location = results["results"][0]["geometry"]["location"]
            return location["lat"], location["lng"]
    print(f"Error: Could not convert zipcode {zipcode} to coordinates.")
    return None, None

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in miles using Haversine formula."""
    # Radius of the Earth in miles
    R = 3958.8
    
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    return distance

def get_current_time(location_lat, location_lng, api_key):
    """Get the current time at the specified location."""
    timestamp = int(time.time())
    timezone_url = f"https://maps.googleapis.com/maps/api/timezone/json?location={location_lat},{location_lng}&timestamp={timestamp}&key={api_key}"
    response = requests.get(timezone_url)
    
    if response.status_code == 200:
        timezone_data = response.json()
        if timezone_data["status"] == "OK":
            timezone_id = timezone_data["timeZoneId"]
            local_tz = pytz.timezone(timezone_id)
            local_time = datetime.now(local_tz)
            return local_time
    
    # If we can't get the local time, return UTC time
    return datetime.now(pytz.UTC)

def is_restaurant_open(place_id, api_key, local_time):
    """Check if a restaurant is currently open."""
    details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=opening_hours&key={api_key}"
    response = requests.get(details_url)
    
    if response.status_code == 200:
        details = response.json()
        if details["status"] == "OK" and "result" in details:
            if "opening_hours" in details["result"]:
                if "open_now" in details["result"]["opening_hours"]:
                    return details["result"]["opening_hours"]["open_now"]
    
    # If we can't determine if it's open, we'll assume it is
    return True

def validate_price_level(price_level_input):
    """Validate the price level input is a valid Google API price level (0-4)."""
    if price_level_input is None:
        print("No price level provided, will show all price levels")
        return None
    
    try:
        # Handle string input if needed
        if isinstance(price_level_input, str) and price_level_input.strip():
            # Check if it's a dollar sign format
            if all(c == '$' for c in price_level_input):
                count = len(price_level_input)
                return count - 1 if 1 <= count <= 5 else None
            # Otherwise try to convert to integer
            price_level_input = price_level_input.strip()
        
        # Convert to int and validate range
        price_level = int(price_level_input)
        if 0 <= price_level <= 4:
            print(f"Using price level: {price_level} (0-4 scale)")
            return price_level
        else:
            print(f"Invalid price level: {price_level_input}. Must be 0-4.")
            return None
    except (ValueError, TypeError) as e:
        print(f"Error parsing price level '{price_level_input}': {e}")
        print("Must be an integer 0-4.")
        return None

def find_open_restaurants(api_key, zipcode, radius_miles, search_term=None, price_level=None):
    """Find open restaurants within a specified radius of a zipcode."""
    # Convert zipcode to coordinates
    lat, lng = get_coordinates_from_zipcode(api_key, zipcode)
    if not lat or not lng:
        return []
    
    # Convert radius from miles to meters (required by Google Places API)
    radius_meters = radius_miles * 1609.34
    
    # Get local time for the location
    local_time = get_current_time(lat, lng, api_key)
    print(f"Local time at {zipcode}: {local_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Build the URL for the Places API
    nearby_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius={radius_meters}&type=restaurant"
    
    # Add search term if provided
    if search_term:
        nearby_url += f"&keyword={search_term}"
    
    # Add price level if provided
    if price_level is not None:
        nearby_url += f"&minprice={price_level}&maxprice={price_level}"
    
    # Add API key
    nearby_url += f"&key={api_key}"
    
    restaurants = []
    page_count = 0
    max_pages = 3  # Limit to 3 pages (60 results) for API usage reasons
    
    while nearby_url and page_count < max_pages:
        page_count += 1
        response = requests.get(nearby_url)
        if response.status_code != 200:
            print(f"Error: API request failed with status {response.status_code}")
            break
        
        results = response.json()
        if results["status"] != "OK":
            print(f"Error: API returned status {results['status']}")
            if "error_message" in results:
                print(f"Error message: {results['error_message']}")
            break
        
        for place in results["results"]:
            # Calculate actual distance
            place_lat = place["geometry"]["location"]["lat"]
            place_lng = place["geometry"]["location"]["lng"]
            distance = calculate_distance(lat, lng, place_lat, place_lng)
            
            # Check if restaurant is currently open
            if is_restaurant_open(place["place_id"], api_key, local_time):
                # Get the price level (numeric 0-4 value from Google API)
                price_level_numeric = place.get("price_level", None)
                
                restaurant_info = {
                    "name": place["name"],
                    "address": place.get("vicinity", "Address not available"),
                    "distance_miles": round(distance, 2),
                    "rating": place.get("rating", "No rating"),
                    "user_ratings_total": place.get("user_ratings_total", 0),
                    "price_level_numeric": price_level_numeric,
                    "place_id": place["place_id"],
                    "types": place.get("types", [])
                }
                
                # Convert price_level from number to $ symbols
                if price_level_numeric is not None:
                    # Google API uses 0-4, but we want to display as $-$$$$
                    # where $ is the cheapest (1) and $$$$ is the most expensive (4)
                    price_level_display = "$" * (price_level_numeric + 1) if 0 <= price_level_numeric <= 3 else "$$$$"
                    restaurant_info["price_level"] = price_level_display
                else:
                    restaurant_info["price_level"] = "Price not available"
                
                restaurants.append(restaurant_info)
        
        # Check for next page of results
        if "next_page_token" in results:
            nearby_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken={results['next_page_token']}&key={api_key}"
            # Google requires a short delay before using the next_page_token
            time.sleep(2)
        else:
            nearby_url = None
    
    # Sort restaurants by distance
    restaurants.sort(key=lambda x: x["distance_miles"])
    
    return restaurants

def export_to_json(data, filename):
    """Export data to a JSON file."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Data successfully exported to {filename}")
        return True
    except Exception as e:
        print(f"Error exporting data to JSON: {e}")
        return False

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Find open restaurants near a zipcode with filtering options.')
    parser.add_argument('--zipcode', type=str, required=True, help='Zipcode to search from')
    parser.add_argument('--radius', type=float, required=True, help='Search radius in miles')
    parser.add_argument('--search', type=str, help='Cuisine or restaurant type (e.g., mexican, bagels, asian)')
    parser.add_argument('--price-level', type=int, help='Price level (0-4, where 0 is least expensive and 4 is most expensive)')
    
    args = parser.parse_args()
    
    # Get API key from environment variable for security
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("Error: Google Places API key not found. Please set the GOOGLE_PLACES_API_KEY environment variable.")
        sys.exit(1)
    
    # Validate price level
    print(f"Raw price level arg: {args.price_level}, Type: {type(args.price_level)}")
    price_level = validate_price_level(args.price_level)
    print(f"Validated price level: {price_level}")
    
    # Print search parameters
    print(f"Searching for open restaurants in {args.zipcode}")
    print(f"Radius: {args.radius} miles")
    if args.search:
        print(f"Cuisine/Type: {args.search}")
    
    # Find restaurants
    restaurants = find_open_restaurants(
        api_key, 
        args.zipcode, 
        args.radius, 
        search_term=args.search, 
        price_level=price_level
    )
    
    if not restaurants:
        print("No open restaurants found matching your criteria.")
        sys.exit(0)
    
    print(f"Found {len(restaurants)} open restaurants.")
    
    # Create search terms for filename
    search_term = args.search.replace(' ', '_') if args.search else 'all'
    price_term = f"price_{args.price_level}" if args.price_level is not None else 'any_price'
    
    # Create output data structure with metadata
    output_data = {
        "metadata": {
            "zipcode": args.zipcode,
            "radius_miles": args.radius,
            "search_term": args.search,
            "price_level": args.price_level,
            "total_restaurants": len(restaurants),
            "timestamp": datetime.now().isoformat(),
        },
        "restaurants": restaurants
    }
    
    # Export to JSON file
    filename = "results.json"
    if export_to_json(output_data, filename):
        print(f"Restaurant data exported to {filename}")
        
        # Display a sample of the results
        sample_size = min(5, len(restaurants))
        print(f"\nShowing {sample_size} of {len(restaurants)} restaurants found:")
        print("-" * 80)
        
        for i, restaurant in enumerate(restaurants[:sample_size], 1):
            print(f"{i}. {restaurant['name']}")
            print(f"   Address: {restaurant['address']}")
            print(f"   Distance: {restaurant['distance_miles']} miles")
            print(f"   Rating: {restaurant['rating']}/5.0 ({restaurant['user_ratings_total']} reviews)")
            print(f"   Price: {restaurant['price_level']}")
            print(f"   Categories: {', '.join(restaurant['types'][:3])}")  # Show top 3 categories
            print("-" * 80)
        
        print(f"Full results available in {filename}")

if __name__ == "__main__":
    main()