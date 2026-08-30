import React from 'react';
import { WorldLeagueScreen } from './WorldLeagueScreen';
import { GameData, CareerScreen } from '../types';

interface ChampionsLeagueScreenProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setScreen: (screen: CareerScreen) => void;
    showFeedback: (msg: string, type?: 'success' | 'error') => void;
    onCompleteChampionsLeague?: () => void;
}

export const ChampionsLeagueScreen: React.FC<ChampionsLeagueScreenProps> = (props) => {
    return <WorldLeagueScreen {...props} onCompleteWorldLeague={props.onCompleteChampionsLeague} />;
};

export default ChampionsLeagueScreen;
