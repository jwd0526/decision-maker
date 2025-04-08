import FoodDecider from '../components/FoodDecider';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-indigo-600 text-white py-8 px-4 rounded-lg mb-8 text-center shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Food Decision Maker</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Let us help you decide where to eat! Select your preferences and we'll find the perfect restaurant for you.
        </p>
      </div>
      <FoodDecider />
    </main>
  );
}