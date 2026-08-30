import React from 'react';
import { GameData } from '../types';

interface CustomizationHubProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
}

const CustomizationHub: React.FC<CustomizationHubProps> = ({ gameData, setGameData }) => {
    return (
        <div className="p-8 h-full flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                <h2 className="text-3xl font-bold text-teal-500 mb-4">Customization</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    The custom league and team editor is currently under development. Check back in the next version!
                </p>
                <div className="mt-8 flex justify-center">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        </div>
    );
};

export default CustomizationHub;