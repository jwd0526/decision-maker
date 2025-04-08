# Food Decision Maker

A web application that helps you decide where to eat based on meal type, food category, location, and budget.

## Features

- Select from breakfast, lunch, or dinner options
- Choose food categories based on meal type
- Enter your zip code to find local options
- App generates a budget between $5-$40 (with lower budgets being more likely)
- Displays restaurant recommendations based on your criteria
- Integrates with a Python script to find real restaurants using Google Places API

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Set up Python environment (for the restaurant API):
   ```
   cd food-finder
   # Install required Python packages
   pip install requests pytz
   ```

3. Set your Google Places API key:
   ```
   # Edit the .env.local file in the project root
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```
   
   Note: If you don't provide an API key, the app will use mock data.

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. Select a meal type (breakfast, lunch or dinner)
2. Choose a food category
3. Enter your zip code
4. The app generates a random budget (weighted toward lower prices)
5. A Python script is used to query for real restaurants near your location
6. The app automatically selects one option for you
7. You can view other options and select a different one if you prefer

## Python Script Usage

The food-finder.py script can be used standalone:

```
python food-finder.py --zipcode 90210 --radius 5 --search mexican --price $$
```

Parameters:
- `--zipcode`: Your location's zip code (required)
- `--radius`: Search radius in miles (required)
- `--search`: Cuisine type/keyword (optional)
- `--price`: Price level from $ to $$$$ (optional)

Results are saved to results.json in the same directory.

## Tech Stack

- Next.js
- React
- JavaScript
- Python (for restaurant data fetching)
- Tailwind CSS

## Notes

- The app uses the Google Places API via a Python script to fetch real restaurant data
- If API integration fails, it falls back to mock data
- In a production environment, you would want to set up proper error handling and API rate limiting