import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  return(
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <img
          className="w-full h-48 object-cover"
          src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600"
          alt="Laptop on a desk"
        />
        <div className="p-6">
          <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
            Technology
          </span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Tailwind CSS with React
          </h2>
          <p className="text-gray-600 text-sm mb-5 leading-relaxed">
            Building beautiful, responsive user interfaces is much easier when you combine the power of React components with Tailwind's utility classes.
          </p>
          <button className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors focus:ring-4 focus:ring-gray-300">
            Read Article
          </button>
        </div>
      </div>
    </div>
  );
}

export default App
