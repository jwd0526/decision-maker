"use client";

import { useState } from 'react';
import FoodRecommendation from './FoodRecommendation';

const FOOD_CATEGORIES = {
  breakfast: ['Pancakes', 'Eggs', 'Bagels', 'Coffee Shop', 'Diner'],
  lunch: ['Sandwiches', 'Salads', 'Fast Food', 'Tacos', 'Pizza'],
  dinner: ['Italian', 'Mexican', 'Chinese', 'American', 'Thai', 'Indian', 'Japanese']
};

const PRICE_LEVELS = [
  { value: 1, label: '$', description: 'Inexpensive' },
  { value: 2, label: '$$', description: 'Moderate' },
  { value: 3, label: '$$$', description: 'Expensive' },
  { value: 4, label: '$$$$', description: 'Very Expensive' },
];

export default function FoodDecider() {
  const [mealType, setMealType] = useState('');
  const [category, setCategory] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [priceLevel, setPriceLevel] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowResult(true);
  };

  const handleReset = () => {
    setShowResult(false);
    setMealType('');
    setCategory('');
    setZipCode('');
    setPriceLevel(null);
    setSearchRadius(5);
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-lg">
      {!showResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-3 font-medium text-gray-700 text-center">Meal Type:</label>
            <div className="flex flex-wrap gap-3 justify-center">
              {['breakfast', 'lunch', 'dinner'].map((meal) => (
                <button
                  key={meal}
                  type="button"
                  className={`px-6 py-3 rounded-lg font-medium transition duration-200 ${mealType === meal 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => {
                    setMealType(meal);
                    setCategory(''); // Reset category when meal type changes
                  }}
                >
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {mealType && (
            <div className="mt-6">
              <label className="block mb-3 font-medium text-gray-700 text-center">Food Category:</label>
              <div className="grid grid-cols-3 gap-2 justify-items-center">
                {FOOD_CATEGORIES[mealType].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`p-4 rounded-lg transition duration-200  ${category === cat 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category && (
            <div className="mt-6">
              <label htmlFor="zipCode" className="block mb-3 font-medium text-gray-700 text-center">Zip Code:</label>
              <input
                type="text"
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                pattern="[0-9]{5}"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="Enter your zip code"
                required
              />
            </div>
          )}

          {zipCode.length === 5 && (
            <div className="mt-6">
              <label className="block mb-3 font-medium text-gray-700 text-center">Price Level:</label>
              <div className="grid grid-cols-4 gap-2 justify-items-center">
                {PRICE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    className={`p-3 rounded-lg transition duration-200 ${priceLevel === level.value 
                      ? 'bg-amber-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                    onClick={() => setPriceLevel(level.value)}
                  >
                    <div className="text-lg font-bold">{level.label}</div>
                    <div className="text-xs">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {priceLevel && (
            <div className="mt-6">
              <label className="block mb-2 font-medium text-gray-700 text-center">
                Search Radius: {searchRadius} miles
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>
          )}

          {mealType && category && zipCode.length === 5 && priceLevel && (
            <button
              type="submit"
              className="w-full py-3 px-6 mt-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
            >
              Find Food
            </button>
          )}
        </form>
      ) : (
        <FoodRecommendation 
          mealType={mealType} 
          category={category} 
          zipCode={zipCode} 
          priceLevel={priceLevel}
          searchRadius={searchRadius}
          onReset={handleReset} 
        />
      )}
    </div>
  );
}