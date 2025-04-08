"use client";

import { useState, useEffect } from 'react';
import { fetchRestaurants } from '../lib/api';

export default function FoodRecommendation({ mealType, category, zipCode, priceLevel, searchRadius, onReset }) {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);

  useEffect(() => {
    async function getRecommendations() {
      try {
        setLoading(true);
        console.log(`Fetching restaurants with: 
          - Meal type: ${mealType}
          - Category: ${category}
          - Zip code: ${zipCode}
          - Price level: ${priceLevel} (1-4 scale)
          - Search radius: ${searchRadius} miles
        `);
        
        const data = await fetchRestaurants(mealType, category, zipCode, priceLevel, searchRadius);
        console.log(`Received ${data ? data.length : 0} restaurants from API`);
        
        if (data && data.length > 0) {
          console.log(`First restaurant price_level_numeric: ${data[0].price_level_numeric}`);
        }
        
        setRestaurants(data);
        
        // Automatically select one restaurant if results exist
        if (data && data.length > 0) {
          // Pick a restaurant - one with good ratings if possible
          const goodRatedRestaurants = data.filter(r => r.rating >= 4.0);
          const restaurantPool = goodRatedRestaurants.length > 0 ? goodRatedRestaurants : data;
          const randomIndex = Math.floor(Math.random() * restaurantPool.length);
          setSelectedRestaurant(restaurantPool[randomIndex]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to fetch recommendations. Please try again.');
        setLoading(false);
      }
    }

    getRecommendations();
  }, [mealType, category, zipCode, priceLevel, searchRadius]);

  const selectRandomRestaurant = () => {
    if (restaurants && restaurants.length > 0) {
      const currentId = selectedRestaurant ? selectedRestaurant.id : null;
      const availableRestaurants = currentId ? 
        restaurants.filter(r => r.id !== currentId) : 
        restaurants;
      
      if (availableRestaurants.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableRestaurants.length);
        setSelectedRestaurant(availableRestaurants[randomIndex]);
        setShowAllResults(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
        <p className="mt-5 text-lg font-medium">Finding the perfect place for you...</p>
        <p className="mt-2 text-gray-500">Searching for {category} restaurants within {searchRadius} miles of {zipCode}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 bg-red-50 rounded-lg p-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button 
          onClick={onReset} 
          className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="text-center py-10 bg-yellow-50 rounded-lg p-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-lg font-medium mb-4">No restaurants found that match your criteria.</p>
        <button 
          onClick={onReset} 
          className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3">Your Food Decision</h2>
        <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[100px]">
              <p className="text-gray-500 text-sm mb-1">Meal</p>
              <p className="font-semibold">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</p>
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="text-gray-500 text-sm mb-1">Category</p>
              <p className="font-semibold">{category}</p>
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="text-gray-500 text-sm mb-1">Price Level</p>
              <p className="font-semibold">{'$'.repeat(priceLevel)}</p>
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="text-gray-500 text-sm mb-1">Search Radius</p>
              <p className="font-semibold">{searchRadius} miles</p>
            </div>
          </div>
        </div>
      </div>

      {selectedRestaurant && !showAllResults && (
        <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100 mb-6 shadow-md">
          <div className="flex items-center mb-4">
            <div className="bg-emerald-600 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold">We've chosen for you!</h3>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition">
            <h4 className="font-bold text-xl mb-1">{selectedRestaurant.name}</h4>
            <p className="text-gray-600 mb-3">{selectedRestaurant.address}</p>
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
                <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedRestaurant.priceRange}
                </span>
                {selectedRestaurant.rating && (
                  <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                    ★ {selectedRestaurant.rating}/5
                  </span>
                )}
              </div>
              {selectedRestaurant.distance && (
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedRestaurant.distance} miles away
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button 
              onClick={selectRandomRestaurant}
              className="flex-1 py-3 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition shadow-md"
            >
              Not what I was looking for...
            </button>
            <button 
              onClick={() => setShowAllResults(true)}
              className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
            >
              Show all results
            </button>
          </div>
        </div>
      )}

      {showAllResults && (
        <>
          <h3 className="text-lg font-semibold mb-4">All Results ({restaurants.length})</h3>
          
          <ul className="space-y-4 mb-6">
            {restaurants.map((restaurant) => (
              <li key={restaurant.id} 
                  className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition hover:border-indigo-200 hover:shadow-sm
                    ${selectedRestaurant && restaurant.id === selectedRestaurant.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}
                  onClick={() => {
                    setSelectedRestaurant(restaurant);
                    setShowAllResults(false);
                  }}>
                <h4 className="font-bold text-lg">{restaurant.name}</h4>
                <p className="text-gray-600 mb-3">{restaurant.address}</p>
                <div className="flex flex-wrap justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-full text-sm">
                      {restaurant.priceRange}
                    </span>
                    {restaurant.rating && (
                      <span className="text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-full text-sm">
                        ★ {restaurant.rating}/5
                      </span>
                    )}
                  </div>
                  {restaurant.distance && (
                    <span className="text-gray-600 text-sm bg-gray-100 px-2 py-1 rounded-full">
                      {restaurant.distance} miles
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => setShowAllResults(false)}
            className="w-full py-3 px-6 mb-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
          >
            Back to recommendation
          </button>
        </>
      )}

      <button 
        onClick={onReset} 
        className="w-full py-3 px-6 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition shadow-md"
      >
        Start Over
      </button>
    </div>
  );
}