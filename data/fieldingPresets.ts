import { Format } from '../types';

export interface FielderPosition {
    id: string;
    name: string;
    label: string;
    x: number; // 0 - 400 SVG coordinate
    y: number; // 0 - 400 SVG coordinate
    isDeep: boolean; // Outside 30-yard circle (radius 80 centered at (200, 200))
    side: 'off' | 'leg' | 'straight';
}

export type FieldPresetCategory = 
    | 'very_attacking' 
    | 'powerplay_attacking' 
    | 'powerplay_defensive' 
    | 'normal' 
    | 'defensive' 
    | 'offside_trap' 
    | 'legside_trap' 
    | 'spin_web' 
    | 'boundary_lockdown' 
    | 'singles_squeeze';

export interface FieldPreset {
    id: string;
    name: string;
    shortLabel: string;
    category: FieldPresetCategory;
    description: string;
    tag: string;
    deepCount: number;
    ringCount: number;
    recommendedBowlerType?: 'pace' | 'spin' | 'all';
    recommendedLength?: 'short' | 'good' | 'full' | 'yorker';
    recommendedLine?: 'off' | 'middle' | 'leg';
    fielders: FielderPosition[];
}

export const FIELD_PRESETS: FieldPreset[] = [
    // 1. VERY ATTACKING (Test Match Slips Cordon)
    {
        id: 'test_attacking',
        name: 'Test Slips Cordon (Very Attacking)',
        shortLabel: 'Test Slips',
        category: 'very_attacking',
        description: 'Aggressive catching ring with 3 slips, gully, silly point & short leg. Maximum wicket taking pressure.',
        tag: 'WICKET TRAP',
        deepCount: 1,
        ringCount: 8,
        recommendedBowlerType: 'pace',
        recommendedLength: 'good',
        recommendedLine: 'off',
        fielders: [
            { id: 'slip1', name: '1st Slip', label: '1st Slip', x: 215, y: 242, isDeep: false, side: 'off' },
            { id: 'slip2', name: '2nd Slip', label: '2nd Slip', x: 226, y: 246, isDeep: false, side: 'off' },
            { id: 'slip3', name: '3rd Slip', label: '3rd Slip', x: 238, y: 250, isDeep: false, side: 'off' },
            { id: 'gully', name: 'Gully', label: 'Gully', x: 245, y: 230, isDeep: false, side: 'off' },
            { id: 'silly_point', name: 'Silly Point', label: 'Silly Point', x: 216, y: 215, isDeep: false, side: 'off' },
            { id: 'short_leg', name: 'Short Leg', label: 'Short Leg', x: 184, y: 215, isDeep: false, side: 'leg' },
            { id: 'mid_off', name: 'Mid-Off', label: 'Mid-Off', x: 235, y: 155, isDeep: false, side: 'off' },
            { id: 'mid_on', name: 'Mid-On', label: 'Mid-On', x: 165, y: 155, isDeep: false, side: 'leg' },
            { id: 'fine_leg', name: 'Deep Fine Leg', label: 'Deep Fine', x: 110, y: 310, isDeep: true, side: 'leg' },
        ]
    },

    // 2. POWERPLAY ATTACKING (Ring of Fire)
    {
        id: 'pp_attacking',
        name: 'Powerplay Attacking (Ring of Fire)',
        shortLabel: 'PP Attack',
        category: 'powerplay_attacking',
        description: 'Dense 7-man 30-yard ring cutting off powerplay boundaries & aerial drives with 2 deep catchers.',
        tag: 'POWERPLAY',
        deepCount: 2,
        ringCount: 7,
        recommendedBowlerType: 'pace',
        recommendedLength: 'full',
        recommendedLine: 'off',
        fielders: [
            { id: 'slip1', name: '1st Slip', label: 'Slip', x: 218, y: 244, isDeep: false, side: 'off' },
            { id: 'point', name: 'Backward Point', label: 'Pt', x: 255, y: 215, isDeep: false, side: 'off' },
            { id: 'cover_point', name: 'Cover-Point', label: 'Cov-Pt', x: 245, y: 185, isDeep: false, side: 'off' },
            { id: 'extra_cover', name: 'Extra Cover', label: 'Ex Cover', x: 232, y: 160, isDeep: false, side: 'off' },
            { id: 'mid_off', name: 'Mid-Off', label: 'Mid-Off', x: 220, y: 145, isDeep: false, side: 'off' },
            { id: 'mid_on', name: 'Mid-On', label: 'Mid-On', x: 180, y: 145, isDeep: false, side: 'leg' },
            { id: 'mid_wicket', name: 'Short Mid-Wkt', label: 'Mid-Wkt', x: 155, y: 185, isDeep: false, side: 'leg' },
            { id: 'deep_third_man', name: 'Deep Third Man', label: '3rd Man', x: 295, y: 295, isDeep: true, side: 'off' },
            { id: 'deep_fine_leg', name: 'Deep Fine Leg', label: 'Fine Leg', x: 105, y: 295, isDeep: true, side: 'leg' },
        ]
    },

    // 3. POWERPLAY DEFENSIVE (Spread Containment)
    {
        id: 'pp_defensive',
        name: 'Powerplay Defensive (Deep Contain)',
        shortLabel: 'PP Defend',
        category: 'powerplay_defensive',
        description: 'Protects the two major powerplay hitting zones (Deep Midwicket & Deep Cover) to halt early onslaughts.',
        tag: 'CONTAINMENT',
        deepCount: 2,
        ringCount: 7,
        recommendedBowlerType: 'all',
        recommendedLength: 'good',
        recommendedLine: 'middle',
        fielders: [
            { id: 'deep_cover', name: 'Deep Extra Cover', label: 'Deep Cov', x: 310, y: 120, isDeep: true, side: 'off' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', label: 'Deep MidWkt', x: 90, y: 130, isDeep: true, side: 'leg' },
            { id: 'point', name: 'Backward Point', label: 'Pt', x: 255, y: 215, isDeep: false, side: 'off' },
            { id: 'short_cover', name: 'Cover', label: 'Cover', x: 235, y: 175, isDeep: false, side: 'off' },
            { id: 'mid_off', name: 'Mid-Off', label: 'Mid-Off', x: 220, y: 150, isDeep: false, side: 'off' },
            { id: 'mid_on', name: 'Mid-On', label: 'Mid-On', x: 180, y: 150, isDeep: false, side: 'leg' },
            { id: 'square_leg', name: 'Square Leg', label: 'Sq Leg', x: 145, y: 215, isDeep: false, side: 'leg' },
            { id: 'short_third_man', name: 'Short Third Man', label: '3rd Man', x: 245, y: 250, isDeep: false, side: 'off' },
            { id: 'short_fine', name: 'Short Fine Leg', label: 'Fine Leg', x: 155, y: 250, isDeep: false, side: 'leg' },
        ]
    },

    // 4. NORMAL / BALANCED (Standard Middle Overs)
    {
        id: 'normal_balanced',
        name: 'Standard Balanced (Middle Overs)',
        shortLabel: 'Balanced',
        category: 'normal',
        description: 'Classic 4-deep, 5-ring setup balancing boundary protection with tight single prevention in middle overs.',
        tag: 'BALANCED',
        deepCount: 4,
        ringCount: 5,
        recommendedBowlerType: 'all',
        recommendedLength: 'good',
        recommendedLine: 'middle',
        fielders: [
            { id: 'deep_cover', name: 'Deep Cover Point', label: 'Deep Cov', x: 315, y: 150, isDeep: true, side: 'off' },
            { id: 'long_off', name: 'Long-Off', label: 'Long-Off', x: 260, y: 70, isDeep: true, side: 'off' },
            { id: 'long_on', name: 'Long-On', label: 'Long-On', x: 140, y: 70, isDeep: true, side: 'leg' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', label: 'Deep MidWkt', x: 80, y: 160, isDeep: true, side: 'leg' },
            { id: 'point', name: 'Backward Point', label: 'Pt', x: 250, y: 215, isDeep: false, side: 'off' },
            { id: 'cover', name: 'Extra Cover', label: 'Cover', x: 235, y: 175, isDeep: false, side: 'off' },
            { id: 'mid_wicket', name: 'Short Mid-Wkt', label: 'Mid-Wkt', x: 160, y: 180, isDeep: false, side: 'leg' },
            { id: 'square_leg', name: 'Square Leg', label: 'Sq Leg', x: 145, y: 220, isDeep: false, side: 'leg' },
            { id: 'short_third_man', name: 'Short Third Man', label: '3rd Man', x: 245, y: 250, isDeep: false, side: 'off' },
        ]
    },

    // 5. DEFENSIVE / DEATH OVERS (Yorker Wall)
    {
        id: 'death_yorker',
        name: 'Death Overs (Yorker Defense Wall)',
        shortLabel: 'Death Wall',
        category: 'defensive',
        description: 'Maximum 5 outfield sweepers protecting straight boundaries and cow corner against death slogs & yorker digs.',
        tag: 'DEATH OVERS',
        deepCount: 5,
        ringCount: 4,
        recommendedBowlerType: 'pace',
        recommendedLength: 'yorker',
        recommendedLine: 'middle',
        fielders: [
            { id: 'deep_point', name: 'Deep Backward Point', label: 'Deep Pt', x: 330, y: 210, isDeep: true, side: 'off' },
            { id: 'long_off', name: 'Long-Off Straight', label: 'Long-Off', x: 250, y: 65, isDeep: true, side: 'off' },
            { id: 'long_on', name: 'Long-On Straight', label: 'Long-On', x: 150, y: 65, isDeep: true, side: 'leg' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket (Cow Corner)', label: 'Cow Corner', x: 80, y: 150, isDeep: true, side: 'leg' },
            { id: 'deep_square_leg', name: 'Deep Square Leg', label: 'Deep Sq', x: 75, y: 225, isDeep: true, side: 'leg' },
            { id: 'cover_ring', name: 'Extra Cover Ring', label: 'Cover', x: 235, y: 175, isDeep: false, side: 'off' },
            { id: 'short_third_man', name: 'Short Third Man', label: '3rd Man', x: 250, y: 250, isDeep: false, side: 'off' },
            { id: 'mid_wicket_ring', name: 'Mid-Wicket Ring', label: 'Mid-Wkt', x: 160, y: 180, isDeep: false, side: 'leg' },
            { id: 'short_fine', name: 'Short Fine Leg', label: 'Fine Leg', x: 150, y: 250, isDeep: false, side: 'leg' },
        ]
    },

    // 6. OFF-SIDE TRAP (Corridor of Uncertainty)
    {
        id: 'offside_trap',
        name: 'Off-Side Corridor Trap',
        shortLabel: 'Off-Trap',
        category: 'offside_trap',
        description: 'Heavily stacked off-side field (slips, gully, cover-point, deep cover) punishing 4th stump driving errors.',
        tag: 'OUTSIDE OFF',
        deepCount: 3,
        ringCount: 6,
        recommendedBowlerType: 'pace',
        recommendedLength: 'good',
        recommendedLine: 'off',
        fielders: [
            { id: 'slip1', name: '1st Slip', label: '1st Slip', x: 218, y: 245, isDeep: false, side: 'off' },
            { id: 'slip2', name: '2nd Slip', label: '2nd Slip', x: 230, y: 248, isDeep: false, side: 'off' },
            { id: 'gully', name: 'Gully', label: 'Gully', x: 248, y: 232, isDeep: false, side: 'off' },
            { id: 'backward_point', name: 'Backward Point', label: 'Pt', x: 258, y: 205, isDeep: false, side: 'off' },
            { id: 'cover', name: 'Extra Cover', label: 'Cover', x: 238, y: 165, isDeep: false, side: 'off' },
            { id: 'deep_cover', name: 'Deep Extra Cover', label: 'Deep Cov', x: 325, y: 135, isDeep: true, side: 'off' },
            { id: 'deep_third_man', name: 'Deep Third Man', label: '3rd Man', x: 295, y: 295, isDeep: true, side: 'off' },
            { id: 'long_off', name: 'Long-Off', label: 'Long-Off', x: 260, y: 70, isDeep: true, side: 'off' },
            { id: 'mid_on', name: 'Mid-On', label: 'Mid-On', x: 170, y: 155, isDeep: false, side: 'leg' },
        ]
    },

    // 7. LEGSIDE / BOUNCER HOOK TRAP
    {
        id: 'legside_trap',
        name: 'Bouncer & Bodyline Hook Trap',
        shortLabel: 'Bouncer Trap',
        category: 'legside_trap',
        description: 'Stacked leg side with short leg, leg slip & deep boundary catchers for pull and hook miscues.',
        tag: 'SHORT PITCH',
        deepCount: 4,
        ringCount: 5,
        recommendedBowlerType: 'pace',
        recommendedLength: 'short',
        recommendedLine: 'leg',
        fielders: [
            { id: 'short_leg', name: 'Forward Short Leg', label: 'Short Leg', x: 182, y: 215, isDeep: false, side: 'leg' },
            { id: 'leg_slip', name: 'Leg Slip', label: 'Leg Slip', x: 182, y: 245, isDeep: false, side: 'leg' },
            { id: 'square_leg', name: 'Square Leg Ring', label: 'Sq Leg', x: 145, y: 215, isDeep: false, side: 'leg' },
            { id: 'mid_wicket', name: 'Short Mid-Wicket', label: 'Mid-Wkt', x: 160, y: 175, isDeep: false, side: 'leg' },
            { id: 'mid_off', name: 'Mid-Off Ring', label: 'Mid-Off', x: 230, y: 155, isDeep: false, side: 'off' },
            { id: 'deep_square_leg', name: 'Deep Backward Square Leg', label: 'Deep Sq', x: 75, y: 245, isDeep: true, side: 'leg' },
            { id: 'deep_fine_leg', name: 'Deep Fine Leg', label: 'Fine Leg', x: 110, y: 310, isDeep: true, side: 'leg' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', label: 'Deep MidWkt', x: 80, y: 155, isDeep: true, side: 'leg' },
            { id: 'long_on', name: 'Long-On Boundary', label: 'Long-On', x: 140, y: 70, isDeep: true, side: 'leg' },
        ]
    },

    // 8. SPIN WEB (Catching Ring & Bat-Pad)
    {
        id: 'spin_web',
        name: 'Spin Web (Bat-Pad & Catching Circle)',
        shortLabel: 'Spin Web',
        category: 'spin_web',
        description: 'Close-in bat-pad fielders with silly point and slip designed to capture turning edges and bat-pad pops.',
        tag: 'SPIN ATTACK',
        deepCount: 3,
        ringCount: 6,
        recommendedBowlerType: 'spin',
        recommendedLength: 'good',
        recommendedLine: 'middle',
        fielders: [
            { id: 'slip1', name: 'Slip', label: 'Slip', x: 218, y: 244, isDeep: false, side: 'off' },
            { id: 'silly_point', name: 'Silly Point', label: 'Silly Pt', x: 216, y: 215, isDeep: false, side: 'off' },
            { id: 'short_leg', name: 'Bat-Pad Short Leg', label: 'Bat-Pad', x: 184, y: 215, isDeep: false, side: 'leg' },
            { id: 'cover', name: 'Short Cover', label: 'Cover', x: 240, y: 175, isDeep: false, side: 'off' },
            { id: 'mid_wicket', name: 'Short Mid-Wicket', label: 'Mid-Wkt', x: 160, y: 175, isDeep: false, side: 'leg' },
            { id: 'point', name: 'Backward Point', label: 'Pt', x: 250, y: 215, isDeep: false, side: 'off' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', label: 'Deep MidWkt', x: 80, y: 155, isDeep: true, side: 'leg' },
            { id: 'long_off', name: 'Long-Off', label: 'Long-Off', x: 260, y: 70, isDeep: true, side: 'off' },
            { id: 'long_on', name: 'Long-On', label: 'Long-On', x: 140, y: 70, isDeep: true, side: 'leg' },
        ]
    },

    // 9. BOUNDARY LOCKDOWN (Maximum Outfield Protection)
    {
        id: 'boundary_lockdown',
        name: 'Boundary Lockdown (Outer Ring)',
        shortLabel: 'Lockdown',
        category: 'boundary_lockdown',
        description: 'Complete perimeter cordon with 5 deep sweepers stopping all boundary angles against aggressive batters.',
        tag: 'OUTFIELD SWEEP',
        deepCount: 5,
        ringCount: 4,
        recommendedBowlerType: 'all',
        recommendedLength: 'good',
        recommendedLine: 'off',
        fielders: [
            { id: 'deep_third_man', name: 'Deep Third Man', label: '3rd Man', x: 295, y: 295, isDeep: true, side: 'off' },
            { id: 'deep_point', name: 'Deep Point', label: 'Deep Pt', x: 335, y: 200, isDeep: true, side: 'off' },
            { id: 'deep_cover', name: 'Deep Cover', label: 'Deep Cov', x: 320, y: 130, isDeep: true, side: 'off' },
            { id: 'long_off', name: 'Long-Off', label: 'Long-Off', x: 260, y: 65, isDeep: true, side: 'off' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', label: 'Deep MidWkt', x: 80, y: 150, isDeep: true, side: 'leg' },
            { id: 'mid_off_ring', name: 'Mid-Off', label: 'Mid-Off', x: 225, y: 150, isDeep: false, side: 'off' },
            { id: 'mid_on_ring', name: 'Mid-On', label: 'Mid-On', x: 175, y: 150, isDeep: false, side: 'leg' },
            { id: 'mid_wicket_ring', name: 'Short Mid-Wkt', label: 'Mid-Wkt', x: 160, y: 185, isDeep: false, side: 'leg' },
            { id: 'point_ring', name: 'Backward Point', label: 'Pt', x: 248, y: 215, isDeep: false, side: 'off' },
        ]
    },

    // 10. SINGLES SQUEEZE (Inner Ring Clamp)
    {
        id: 'singles_squeeze',
        name: 'Singles Squeeze (Pressure Clamp)',
        shortLabel: 'Squeeze',
        category: 'singles_squeeze',
        description: 'Smothering 7-fielder 30-yard ring cutting off every strike rotation and single to build immense dot ball pressure.',
        tag: 'DOT PRESSURE',
        deepCount: 2,
        ringCount: 7,
        recommendedBowlerType: 'all',
        recommendedLength: 'good',
        recommendedLine: 'middle',
        fielders: [
            { id: 'point', name: 'Backward Point', label: 'Pt', x: 252, y: 215, isDeep: false, side: 'off' },
            { id: 'cover_point', name: 'Cover Point', label: 'Cov-Pt', x: 245, y: 185, isDeep: false, side: 'off' },
            { id: 'extra_cover', name: 'Extra Cover', label: 'Ex Cov', x: 232, y: 160, isDeep: false, side: 'off' },
            { id: 'mid_off', name: 'Mid-Off Tight', label: 'Mid-Off', x: 218, y: 145, isDeep: false, side: 'off' },
            { id: 'mid_on', name: 'Mid-On Tight', label: 'Mid-On', x: 182, y: 145, isDeep: false, side: 'leg' },
            { id: 'short_mid_wicket', name: 'Short Mid-Wkt', label: 'Mid-Wkt', x: 155, y: 185, isDeep: false, side: 'leg' },
            { id: 'square_leg', name: 'Square Leg Ring', label: 'Sq Leg', x: 145, y: 215, isDeep: false, side: 'leg' },
            { id: 'deep_mid_wicket', name: 'Deep Mid-Wicket', label: 'Deep MidWkt', x: 80, y: 155, isDeep: true, side: 'leg' },
            { id: 'long_off', name: 'Long-Off', label: 'Long-Off', x: 260, y: 70, isDeep: true, side: 'off' },
        ]
    }
];

export interface MatchFieldRestrictions {
    isTest: boolean;
    isPowerplay: boolean;
    isDeath: boolean;
    maxDeepFielders: number;
    ruleDescription: string;
    phaseName: string;
}

export function getMatchFieldRestrictions(format?: Format | string, ballsBowled: number = 0): MatchFieldRestrictions {
    const isTest = format === Format.SHIELD || (typeof format === 'string' && (format.includes('First-Class') || format.includes('Shield') || format.includes('Test')));
    if (isTest) {
        return {
            isTest: true,
            isPowerplay: false,
            isDeath: false,
            maxDeepFielders: 9,
            ruleDescription: 'Unrestricted field (Test Match - No fielding restrictions lock)',
            phaseName: 'TEST MATCH - UNRESTRICTED'
        };
    }

    if (typeof format === 'string' && format.includes('T20')) {
        const isPowerplay = ballsBowled < 36; // First 6 overs
        const isDeath = ballsBowled >= 96;    // Overs 16-20
        return {
            isTest: false,
            isPowerplay,
            isDeath,
            maxDeepFielders: isPowerplay ? 2 : 5,
            ruleDescription: isPowerplay ? 'Mandatory Powerplay (Overs 1-6): Max 2 fielders outside 30-yd ring' : 'Non-Powerplay: Max 5 fielders outside ring',
            phaseName: isPowerplay ? 'MANDATORY POWERPLAY (MAX 2 OUTSIDE)' : (isDeath ? 'DEATH OVERS (MAX 5 OUTSIDE)' : 'MIDDLE OVERS (MAX 5 OUTSIDE)')
        };
    }

    // ODI / List A (50 Overs)
    const isPowerplay = ballsBowled < 60; // First 10 overs
    const isDeath = ballsBowled >= 240;   // Overs 41-50
    return {
        isTest: false,
        isPowerplay,
        isDeath,
        maxDeepFielders: isPowerplay ? 2 : (ballsBowled < 240 ? 4 : 5),
        ruleDescription: isPowerplay ? 'Mandatory Powerplay 1 (Overs 1-10): Max 2 fielders outside ring' : (isDeath ? 'Powerplay 3 (Overs 41-50): Max 5 fielders outside ring' : 'Powerplay 2 (Overs 11-40): Max 4 fielders outside ring'),
        phaseName: isPowerplay ? 'POWERPLAY 1 (MAX 2 OUTSIDE)' : (isDeath ? 'POWERPLAY 3 / DEATH (MAX 5 OUTSIDE)' : 'POWERPLAY 2 (MAX 4 OUTSIDE)')
    };
}

export function isPresetValidForSituation(preset: FieldPreset, restrictions: MatchFieldRestrictions): boolean {
    if (restrictions.isTest) return true;
    return preset.deepCount <= restrictions.maxDeepFielders;
}

export function getSmartFieldPreset(
    length: 'yorker' | 'full' | 'good' | 'short',
    line: 'off' | 'middle' | 'leg',
    isSpinBowler: boolean,
    format: Format,
    ballsBowled: number
): FieldPreset {
    const restrictions = getMatchFieldRestrictions(format, ballsBowled);

    if (restrictions.isTest) {
        if (isSpinBowler) return FIELD_PRESETS.find(p => p.id === 'spin_web') || FIELD_PRESETS[0];
        if (length === 'short' || line === 'leg') return FIELD_PRESETS.find(p => p.id === 'legside_trap') || FIELD_PRESETS[0];
        if (line === 'off') return FIELD_PRESETS.find(p => p.id === 'offside_trap') || FIELD_PRESETS[0];
        return FIELD_PRESETS.find(p => p.id === 'test_attacking') || FIELD_PRESETS[0];
    }

    if (restrictions.isPowerplay) {
        if (line === 'off' || length === 'full') {
            return FIELD_PRESETS.find(p => p.id === 'pp_attacking') || FIELD_PRESETS[1];
        }
        return FIELD_PRESETS.find(p => p.id === 'pp_defensive') || FIELD_PRESETS[2];
    }

    if (restrictions.isDeath || length === 'yorker') {
        return FIELD_PRESETS.find(p => p.id === 'death_yorker') || FIELD_PRESETS[4];
    }

    if (isSpinBowler) {
        return FIELD_PRESETS.find(p => p.id === 'spin_web') || FIELD_PRESETS[7];
    }

    if (length === 'short' || line === 'leg') {
        return FIELD_PRESETS.find(p => p.id === 'legside_trap') || FIELD_PRESETS[6];
    }

    if (line === 'off') {
        return FIELD_PRESETS.find(p => p.id === 'offside_trap') || FIELD_PRESETS[5];
    }

    return FIELD_PRESETS.find(p => p.id === 'normal_balanced') || FIELD_PRESETS[3];
}
