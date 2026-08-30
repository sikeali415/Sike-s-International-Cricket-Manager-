
import React from 'react';
import { Category, getFormatsForCategory } from '../utils';
import { Format } from '../types';

interface CategoryTabsProps {
    category: Category;
    setCategory: (cat: Category) => void;
    className?: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ category, setCategory, className = "" }) => {
    const categories: Category[] = ['T20', 'List A', 'First Class'];
    
    return (
        <div className={`flex justify-center border-b border-gray-300 dark:border-gray-700 mb-4 ${className}`}>
            {categories.map((cat) => (
                <button 
                    key={cat} 
                    onClick={() => setCategory(cat)} 
                    className={`px-4 py-2 text-sm font-semibold transition-all ${category === cat ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
};

interface FormatDropdownProps {
    category: Category;
    selectedFormat: Format;
    setSelectedFormat: (f: Format) => void;
    className?: string;
}

export const FormatDropdown: React.FC<FormatDropdownProps> = ({ category, selectedFormat, setSelectedFormat, className = "" }) => {
    const formats = getFormatsForCategory(category);
    
    return (
        <div className={`mb-4 ${className}`}>
            <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as Format)}
                className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
                {formats.map(f => (
                    <option key={f} value={f}>{f}</option>
                ))}
            </select>
        </div>
    );
};
