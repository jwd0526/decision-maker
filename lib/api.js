// API client to call the backend route
export async function fetchRestaurants(mealType, category, zipCode, priceLevel, searchRadius) {
  try {
    const response = await fetch('/api/restaurants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mealType,
        category,
        zipCode,
        priceLevel,
        searchRadius
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.restaurants;
  } catch (error) {
    console.error('Error fetching restaurant data:', error);
    throw error;
  }
}
