import React, { useState, useMemo } from 'react';
import { Player, GameData, PlayerRole, BattingStyle } from '../types';
import { playSFX } from '../utils/soundManager';
import { Icons } from './Icons';
import { Shield, Target, Zap, RotateCcw, User, Activity, Flame, ChevronRight, Sliders, Layers, Award, ArrowLeft } from 'lucide-react';

export type LengthZoneId = 'yorker' | 'full' | 'good' | 'short';
export type LineZoneId = 'off' | 'middle' | 'leg';
export type WagonZoneId = 'third_man' | 'point' | 'cover' | 'mid_off' | 'mid_on' | 'mid_wicket' | 'square_leg' | 'fine_leg';
export type FielderPositionType = 'open' | 'ring' | 'deep';

export interface ShotOption {
    id: string;
    name: string;
    targetZone: WagonZoneId;
    alternativeZone?: WagonZoneId;
    category: 'Attacking' | 'Defensive' | 'Lofted' | 'Placement';
    riskBase: number; // 0 - 100
    powerBase: number; // 0 - 100
    boundaryBase: number; // 0 - 100
    description: string;
    dismissalMode: string;
    colorCode: string;
    isAerial: boolean;
}

export interface BowlingZoneDef {
    length: LengthZoneId;
    line: LineZoneId;
    lengthLabel: string;
    lineLabel: string;
    color: string;
    shots: ShotOption[];
}

// 12 Delivery Coordinate Zones (4 Lengths x 3 Lines)
export const BOWLING_DELIVERY_MATRIX: Record<`${LengthZoneId}_${LineZoneId}`, BowlingZoneDef> = {
    // --- GOOD LENGTH ---
    'good_off': {
        length: 'good',
        line: 'off',
        lengthLabel: 'Good Length',
        lineLabel: 'Off Stump Corridor',
        color: '#10b981',
        shots: [
            {
                id: 'cover_drive_good_off',
                name: 'Classic Cover Drive',
                targetZone: 'cover',
                alternativeZone: 'mid_off',
                category: 'Placement',
                riskBase: 24,
                powerBase: 78,
                boundaryBase: 48,
                description: 'Leaning into the pitch with a high left elbow, caressing the ball between extra cover and mid-off.',
                dismissalMode: 'Caught at Slip or Cover Ring',
                colorCode: '#0d9488',
                isAerial: false
            },
            {
                id: 'square_cut_good_off',
                name: 'Square Cut',
                targetZone: 'point',
                alternativeZone: 'third_man',
                category: 'Attacking',
                riskBase: 38,
                powerBase: 82,
                boundaryBase: 56,
                description: 'Rocking back onto the back foot, slashing hard with horizontal bat past backward point.',
                dismissalMode: 'Edged to Wicketkeeper / Gully',
                colorCode: '#0284c7',
                isAerial: false
            },
            {
                id: 'defensive_block_good_off',
                name: 'Corridor Defensive Block',
                targetZone: 'cover',
                alternativeZone: 'point',
                category: 'Defensive',
                riskBase: 8,
                powerBase: 15,
                boundaryBase: 0,
                description: 'Soft hands, playing right under the eyes with bat and pad glued together.',
                dismissalMode: 'Late inside edge to Stumps',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'late_cut_good_off',
                name: 'Delicate Late Cut',
                targetZone: 'third_man',
                alternativeZone: 'point',
                category: 'Placement',
                riskBase: 32,
                powerBase: 65,
                boundaryBase: 42,
                description: 'Using the bowler\'s pace to steer the ball off the open face behind backward point.',
                dismissalMode: 'Feathered edge to Keeper',
                colorCode: '#f59e0b',
                isAerial: false
            }
        ]
    },
    'good_middle': {
        length: 'good',
        line: 'middle',
        lengthLabel: 'Good Length',
        lineLabel: 'Middle Stump Line',
        color: '#10b981',
        shots: [
            {
                id: 'straight_drive_good_mid',
                name: 'Crisp Straight Drive',
                targetZone: 'mid_off',
                alternativeZone: 'mid_on',
                category: 'Placement',
                riskBase: 22,
                powerBase: 74,
                boundaryBase: 44,
                description: 'Meeting the ball cleanly under the nose, punching straight down the ground past the non-striker.',
                dismissalMode: 'Bowled through gate / Bowler caught & bowled',
                colorCode: '#14b8a6',
                isAerial: false
            },
            {
                id: 'forward_defense_good_mid',
                name: 'Forward Defense',
                targetZone: 'mid_on',
                alternativeZone: 'mid_off',
                category: 'Defensive',
                riskBase: 6,
                powerBase: 12,
                boundaryBase: 0,
                description: 'Textbook forward defense, smothering the bounce dead into the turf.',
                dismissalMode: 'LBW if missing inside edge',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'on_drive_good_mid',
                name: 'Wristy On Drive',
                targetZone: 'mid_on',
                alternativeZone: 'mid_wicket',
                category: 'Placement',
                riskBase: 28,
                powerBase: 72,
                boundaryBase: 40,
                description: 'Subtle roll of the bottom wrist, directing the ball through the mid-on region.',
                dismissalMode: 'Leading edge to Mid-Off',
                colorCode: '#10b981',
                isAerial: false
            },
            {
                id: 'inside_out_loft_good_mid',
                name: 'Inside-Out Lofted Drive',
                targetZone: 'cover',
                alternativeZone: 'mid_off',
                category: 'Lofted',
                riskBase: 52,
                powerBase: 90,
                boundaryBase: 70,
                description: 'Backing away slightly towards leg, carving the ball with high loft over extra cover.',
                dismissalMode: 'Caught at Deep Extra Cover boundary',
                colorCode: '#ec4899',
                isAerial: true
            }
        ]
    },
    'good_leg': {
        length: 'good',
        line: 'leg',
        lengthLabel: 'Good Length',
        lineLabel: 'Leg Stump / Pads',
        color: '#10b981',
        shots: [
            {
                id: 'midwicket_flick_good_leg',
                name: 'Whipped Midwicket Flick',
                targetZone: 'mid_wicket',
                alternativeZone: 'square_leg',
                category: 'Attacking',
                riskBase: 26,
                powerBase: 80,
                boundaryBase: 52,
                description: 'Supple wrists rolling over the ball to whip it from middle-and-leg into deep midwicket.',
                dismissalMode: 'LBW if beaten for pace',
                colorCode: '#f43f5e',
                isAerial: false
            },
            {
                id: 'fine_leg_glance_good_leg',
                name: 'Fine Leg Glance',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Placement',
                riskBase: 18,
                powerBase: 68,
                boundaryBase: 46,
                description: 'Turning the bat face at the moment of impact to deflect the pace fine of the wicketkeeper.',
                dismissalMode: 'Caught down the leg-side by Keeper',
                colorCode: '#ec4899',
                isAerial: false
            },
            {
                id: 'paddle_sweep_good_leg',
                name: 'Paddle Sweep',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Placement',
                riskBase: 34,
                powerBase: 62,
                boundaryBase: 38,
                description: 'Dropping to one knee and cushioning the ball fine behind square leg.',
                dismissalMode: 'Top edge caught by Short Fine Leg',
                colorCode: '#8b5cf6',
                isAerial: false
            },
            {
                id: 'leg_defensive_good_leg',
                name: 'Tucked Body Defense',
                targetZone: 'square_leg',
                alternativeZone: 'mid_on',
                category: 'Defensive',
                riskBase: 10,
                powerBase: 20,
                boundaryBase: 0,
                description: 'Working the ball softly off the pads into the leg-side gap for a quick rotation single.',
                dismissalMode: 'Run out on attempted tight single',
                colorCode: '#64748b',
                isAerial: false
            }
        ]
    },

    // --- FULL LENGTH ---
    'full_off': {
        length: 'full',
        line: 'off',
        lengthLabel: 'Full Length',
        lineLabel: 'Off Stump (Half-Volley)',
        color: '#6366f1',
        shots: [
            {
                id: 'lofted_cover_full_off',
                name: 'Lofted Extra Cover Drive',
                targetZone: 'cover',
                alternativeZone: 'mid_off',
                category: 'Lofted',
                riskBase: 44,
                powerBase: 94,
                boundaryBase: 76,
                description: 'Extending the arms through the line of the half-volley, launching high over the infield.',
                dismissalMode: 'Caught at Long-Off / Deep Cover boundary',
                colorCode: '#6366f1',
                isAerial: true
            },
            {
                id: 'frontfoot_drive_full_off',
                name: 'Front-Foot Cover Drive',
                targetZone: 'cover',
                alternativeZone: 'mid_off',
                category: 'Attacking',
                riskBase: 20,
                powerBase: 86,
                boundaryBase: 62,
                description: 'Reaching out to the pitch of the ball, driving along the carpet through the covers.',
                dismissalMode: 'Caught at Extra Cover ring',
                colorCode: '#0d9488',
                isAerial: false
            },
            {
                id: 'off_drive_full_off',
                name: 'Punched Off Drive',
                targetZone: 'mid_off',
                alternativeZone: 'cover',
                category: 'Placement',
                riskBase: 18,
                powerBase: 76,
                boundaryBase: 48,
                description: 'Firm presentation of the full blade, punching cleanly past mid-off.',
                dismissalMode: 'Direct hit runout / Mid-Off catch',
                colorCode: '#14b8a6',
                isAerial: false
            },
            {
                id: 'squirt_point_full_off',
                name: 'Open Face Slice to Point',
                targetZone: 'point',
                alternativeZone: 'third_man',
                category: 'Placement',
                riskBase: 28,
                powerBase: 70,
                boundaryBase: 44,
                description: 'Slicing under the ball to pierce backward point with angle.',
                dismissalMode: 'Caught at Backward Point',
                colorCode: '#0284c7',
                isAerial: false
            }
        ]
    },
    'full_middle': {
        length: 'full',
        line: 'middle',
        lengthLabel: 'Full Length',
        lineLabel: 'Middle Stump (In the Slot)',
        color: '#6366f1',
        shots: [
            {
                id: 'straight_loft_full_mid',
                name: 'Downtown Straight Loft (Six)',
                targetZone: 'mid_off',
                alternativeZone: 'mid_on',
                category: 'Lofted',
                riskBase: 42,
                powerBase: 98,
                boundaryBase: 82,
                description: 'Full extension of arms straight over the bowler\'s head into the sightscreen.',
                dismissalMode: 'Caught at Long-On / Long-Off boundary',
                colorCode: '#6366f1',
                isAerial: true
            },
            {
                id: 'long_on_smash_full_mid',
                name: 'High Backlift Long-On Drive',
                targetZone: 'mid_on',
                alternativeZone: 'mid_off',
                category: 'Attacking',
                riskBase: 25,
                powerBase: 88,
                boundaryBase: 64,
                description: 'Meeting the ball right under the nose and driving through mid-on with high velocity.',
                dismissalMode: 'Bowled through pad gap',
                colorCode: '#10b981',
                isAerial: false
            },
            {
                id: 'wrist_helicopter_full_mid',
                name: 'Wrist Snap Helicopter Whip',
                targetZone: 'mid_wicket',
                alternativeZone: 'mid_on',
                category: 'Attacking',
                riskBase: 48,
                powerBase: 92,
                boundaryBase: 74,
                description: 'Fierce bottom-hand whip with high 360-degree bat finish over wide midwicket.',
                dismissalMode: 'Top edge caught at Deep Midwicket',
                colorCode: '#f43f5e',
                isAerial: true
            },
            {
                id: 'full_front_push_full_mid',
                name: 'Solid Front-Foot Push',
                targetZone: 'mid_off',
                alternativeZone: 'mid_on',
                category: 'Defensive',
                riskBase: 8,
                powerBase: 35,
                boundaryBase: 12,
                description: 'Checked punch along the ground to safely take the single on offer.',
                dismissalMode: 'Bowled if missing length',
                colorCode: '#64748b',
                isAerial: false
            }
        ]
    },
    'full_leg': {
        length: 'full',
        line: 'leg',
        lengthLabel: 'Full Length',
        lineLabel: 'Leg Stump (Pads Half-Volley)',
        color: '#6366f1',
        shots: [
            {
                id: 'slog_sweep_full_leg',
                name: 'Monster Slog Sweep',
                targetZone: 'mid_wicket',
                alternativeZone: 'square_leg',
                category: 'Lofted',
                riskBase: 46,
                powerBase: 96,
                boundaryBase: 80,
                description: 'Dropping onto one knee and swinging in a wide arc high into the deep midwicket stands.',
                dismissalMode: 'Caught at Deep Square / Midwicket rope',
                colorCode: '#f43f5e',
                isAerial: true
            },
            {
                id: 'wrist_whip_full_leg',
                name: 'Wristy On-Drive to Midwicket',
                targetZone: 'mid_wicket',
                alternativeZone: 'mid_on',
                category: 'Attacking',
                riskBase: 22,
                powerBase: 82,
                boundaryBase: 58,
                description: 'Turning wrists on contact, placing through the gap between mid-on and midwicket.',
                dismissalMode: 'Leading edge caught at Cover',
                colorCode: '#10b981',
                isAerial: false
            },
            {
                id: 'fine_sweep_full_leg',
                name: 'Traditional Fine Sweep',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Placement',
                riskBase: 28,
                powerBase: 74,
                boundaryBase: 50,
                description: 'Getting low to paddle the full delivery fine of 45 behind the wicketkeeper.',
                dismissalMode: 'Top-edge balloon to Short Fine Leg',
                colorCode: '#ec4899',
                isAerial: false
            },
            {
                id: 'square_leg_clip_full_leg',
                name: 'Clip to Square Leg',
                targetZone: 'square_leg',
                alternativeZone: 'fine_leg',
                category: 'Placement',
                riskBase: 14,
                powerBase: 64,
                boundaryBase: 36,
                description: 'Closing the face of the bat cleanly to tuck through square leg for easy runs.',
                dismissalMode: 'LBW if struck in front',
                colorCode: '#8b5cf6',
                isAerial: false
            }
        ]
    },

    // --- SHORT PITCH ---
    'short_off': {
        length: 'short',
        line: 'off',
        lengthLabel: 'Short Pitch',
        lineLabel: 'Outside Off Stump',
        color: '#eab308',
        shots: [
            {
                id: 'slash_cut_short_off',
                name: 'Slash Cut over Point',
                targetZone: 'point',
                alternativeZone: 'third_man',
                category: 'Attacking',
                riskBase: 42,
                powerBase: 88,
                boundaryBase: 68,
                description: 'Throwing hands through the short wide ball with ferocious bat speed over backward point.',
                dismissalMode: 'Upper edge caught at Deep Point / Third Man',
                colorCode: '#0284c7',
                isAerial: true
            },
            {
                id: 'upper_cut_short_off',
                name: 'Upper Cut / Ramp',
                targetZone: 'third_man',
                alternativeZone: 'point',
                category: 'Lofted',
                riskBase: 48,
                powerBase: 84,
                boundaryBase: 72,
                description: 'Arching backwards to ramp the high bouncer cleanly over the slips toward third man boundary.',
                dismissalMode: 'Caught at Fly Slip / Deep Third Man',
                colorCode: '#f59e0b',
                isAerial: true
            },
            {
                id: 'backfoot_punch_short_off',
                name: 'Back-Foot Cover Punch',
                targetZone: 'cover',
                alternativeZone: 'point',
                category: 'Placement',
                riskBase: 26,
                powerBase: 76,
                boundaryBase: 50,
                description: 'Standing tall on toes to punch the ball down on top of the bounce through extra cover.',
                dismissalMode: 'Caught at Cover Ring',
                colorCode: '#0d9488',
                isAerial: false
            },
            {
                id: 'sway_leave_short_off',
                name: 'Sway & Leave',
                targetZone: 'point',
                alternativeZone: 'third_man',
                category: 'Defensive',
                riskBase: 4,
                powerBase: 0,
                boundaryBase: 0,
                description: 'Arching upper body out of line, dropping wrists cleanly to let ball pass harmlessly.',
                dismissalMode: 'Feathered glove down leg (rare)',
                colorCode: '#64748b',
                isAerial: false
            }
        ]
    },
    'short_middle': {
        length: 'short',
        line: 'middle',
        lengthLabel: 'Short Pitch',
        lineLabel: 'Middle Stump (At the Helmet)',
        color: '#eab308',
        shots: [
            {
                id: 'swivel_pull_short_mid',
                name: 'Swivel Pull Shot',
                targetZone: 'mid_wicket',
                alternativeZone: 'square_leg',
                category: 'Attacking',
                riskBase: 36,
                powerBase: 90,
                boundaryBase: 66,
                description: 'Swiveling on the back foot, rolling wrists over the ball to keep the pull down into deep midwicket.',
                dismissalMode: 'Top edge caught at Deep Square Leg',
                colorCode: '#f43f5e',
                isAerial: false
            },
            {
                id: 'hook_shot_short_mid',
                name: 'Aggressive Hook Shot (Six)',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Lofted',
                riskBase: 58,
                powerBase: 96,
                boundaryBase: 84,
                description: 'Taking on the bumper with full bat swing in front of the nose, flying over fine leg.',
                dismissalMode: 'Top edge skier caught at Deep Fine Leg',
                colorCode: '#ec4899',
                isAerial: true
            },
            {
                id: 'duck_weave_short_mid',
                name: 'Duck & Weave Under Ball',
                targetZone: 'mid_wicket',
                alternativeZone: 'square_leg',
                category: 'Defensive',
                riskBase: 5,
                powerBase: 0,
                boundaryBase: 0,
                description: 'Bending knees and ducking beneath the ball\'s trajectory safely.',
                dismissalMode: 'Hit on helmet / Caught on rebound',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'drop_wrist_fend_short_mid',
                name: 'Soft-Gloved Fend Block',
                targetZone: 'square_leg',
                alternativeZone: 'mid_on',
                category: 'Defensive',
                riskBase: 18,
                powerBase: 25,
                boundaryBase: 0,
                description: 'Taking bottom hand off the handle, letting ball drop dead at feet.',
                dismissalMode: 'Caught at Short Leg / Silly Point',
                colorCode: '#64748b',
                isAerial: false
            }
        ]
    },
    'short_leg': {
        length: 'short',
        line: 'leg',
        lengthLabel: 'Short Pitch',
        lineLabel: 'Down Leg Stump (Rib-Cage)',
        color: '#eab308',
        shots: [
            {
                id: 'backward_square_pull_short_leg',
                name: 'Controlled Backward Square Pull',
                targetZone: 'square_leg',
                alternativeZone: 'fine_leg',
                category: 'Attacking',
                riskBase: 30,
                powerBase: 84,
                boundaryBase: 60,
                description: 'Tucking under the ribs, swiveling to pull behind square leg with control.',
                dismissalMode: 'Caught at Deep Square Leg fence',
                colorCode: '#8b5cf6',
                isAerial: false
            },
            {
                id: 'fine_leg_hook_short_leg',
                name: 'Fine Leg Hook & Glance',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Placement',
                riskBase: 32,
                powerBase: 76,
                boundaryBase: 54,
                description: 'Helping the high ball on its way over the keeper\'s left shoulder.',
                dismissalMode: 'Caught by Wicketkeeper taking high grab',
                colorCode: '#ec4899',
                isAerial: true
            },
            {
                id: 'evade_tuck_short_leg',
                name: 'Body Evade & Drop',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Defensive',
                riskBase: 6,
                powerBase: 0,
                boundaryBase: 0,
                description: 'Turning chest away to allow the ball through down leg side.',
                dismissalMode: 'Glove appeal / Down leg strangle',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'ramp_behind_short_leg',
                name: 'Scoop / Ramp Behind Square',
                targetZone: 'fine_leg',
                alternativeZone: 'third_man',
                category: 'Lofted',
                riskBase: 54,
                powerBase: 88,
                boundaryBase: 75,
                description: 'Using pace of delivery to ramp ball aerially behind keeper over fine leg boundary.',
                dismissalMode: 'Bowled or caught off top of blade',
                colorCode: '#f59e0b',
                isAerial: true
            }
        ]
    },

    // --- YORKER / FULL TOSS ---
    'yorker_off': {
        length: 'yorker',
        line: 'off',
        lengthLabel: 'Yorker / Full Toss',
        lineLabel: 'Wide Off-Stump Toe-Crusher',
        color: '#ef4444',
        shots: [
            {
                id: 'squeeze_thirdman_york_off',
                name: 'Steer & Squeeze to Third Man',
                targetZone: 'third_man',
                alternativeZone: 'point',
                category: 'Placement',
                riskBase: 26,
                powerBase: 70,
                boundaryBase: 44,
                description: 'Guiding the low toe-crusher down to third man with open blade angle.',
                dismissalMode: 'Bowled off inside edge onto off stump',
                colorCode: '#f59e0b',
                isAerial: false
            },
            {
                id: 'slap_point_york_off',
                name: 'Low Full-Toss Slap to Point',
                targetZone: 'point',
                alternativeZone: 'cover',
                category: 'Attacking',
                riskBase: 38,
                powerBase: 84,
                boundaryBase: 62,
                description: 'Carving the wide delivery hard through backward point.',
                dismissalMode: 'Caught at Backward Point',
                colorCode: '#0284c7',
                isAerial: false
            },
            {
                id: 'solid_jam_york_off',
                name: 'Solid Toe-Dig Block',
                targetZone: 'cover',
                alternativeZone: 'point',
                category: 'Defensive',
                riskBase: 12,
                powerBase: 20,
                boundaryBase: 0,
                description: 'Dropping the bat firmly in the blockhole right in front of the toe.',
                dismissalMode: 'Bowled under bottom of bat',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'inside_out_slice_york_off',
                name: 'Inside-Out Lofted Slice',
                targetZone: 'cover',
                alternativeZone: 'third_man',
                category: 'Lofted',
                riskBase: 56,
                powerBase: 90,
                boundaryBase: 72,
                description: 'Backing away and elevating the toe-crusher over the off-side ring.',
                dismissalMode: 'Caught at Deep Cover boundary',
                colorCode: '#ec4899',
                isAerial: true
            }
        ]
    },
    'yorker_middle': {
        length: 'yorker',
        line: 'middle',
        lengthLabel: 'Yorker / Full Toss',
        lineLabel: 'Middle Stump (Base of Stumps)',
        color: '#ef4444',
        shots: [
            {
                id: 'dig_out_block_york_mid',
                name: 'Emergency Toe Dig-Out',
                targetZone: 'mid_off',
                alternativeZone: 'mid_on',
                category: 'Defensive',
                riskBase: 15,
                powerBase: 22,
                boundaryBase: 0,
                description: 'Dropping bat at high speed right at base of middle stump to dig out the toe-crusher.',
                dismissalMode: 'Bowled (Clean bowled through legs)',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'helicopter_york_mid',
                name: 'Explosive Helicopter Shot',
                targetZone: 'mid_wicket',
                alternativeZone: 'mid_on',
                category: 'Lofted',
                riskBase: 50,
                powerBase: 96,
                boundaryBase: 82,
                description: 'Snapping bottom wrist violently upward from the dirt, clearing long-on fence.',
                dismissalMode: 'Bowled / LBW if missing bat plane',
                colorCode: '#f43f5e',
                isAerial: true
            },
            {
                id: 'straight_squeeze_york_mid',
                name: 'Straight Push & Squeeze',
                targetZone: 'mid_on',
                alternativeZone: 'mid_off',
                category: 'Placement',
                riskBase: 24,
                powerBase: 65,
                boundaryBase: 36,
                description: 'Directing the ball cleanly past bowler\'s ankles for a guaranteed single.',
                dismissalMode: 'Bowled off foot deflection',
                colorCode: '#10b981',
                isAerial: false
            },
            {
                id: 'scoop_ramp_york_mid',
                name: 'Dilscoop / Lap Over Keeper',
                targetZone: 'fine_leg',
                alternativeZone: 'third_man',
                category: 'Lofted',
                riskBase: 64,
                powerBase: 92,
                boundaryBase: 80,
                description: 'Dropping to both knees and chipping the yorker high over wicketkeeper\'s head.',
                dismissalMode: 'Bowled / Struck on helmet',
                colorCode: '#f59e0b',
                isAerial: true
            }
        ]
    },
    'yorker_leg': {
        length: 'yorker',
        line: 'leg',
        lengthLabel: 'Yorker / Full Toss',
        lineLabel: 'Leg Stump / Firing at Toes',
        color: '#ef4444',
        shots: [
            {
                id: 'toe_flick_york_leg',
                name: 'Whipped Flick off Toes',
                targetZone: 'mid_wicket',
                alternativeZone: 'square_leg',
                category: 'Attacking',
                riskBase: 32,
                powerBase: 84,
                boundaryBase: 60,
                description: 'Flicking the ball off the toe with supple wrists into midwicket pocket.',
                dismissalMode: 'LBW (Dead plumb in front)',
                colorCode: '#f43f5e',
                isAerial: false
            },
            {
                id: 'paddle_fine_york_leg',
                name: 'Paddle Glance to Fine Leg',
                targetZone: 'fine_leg',
                alternativeZone: 'square_leg',
                category: 'Placement',
                riskBase: 28,
                powerBase: 72,
                boundaryBase: 48,
                description: 'Deflecting the leg-stump yorker fine behind square on the on-side.',
                dismissalMode: 'Bowled behind legs',
                colorCode: '#ec4899',
                isAerial: false
            },
            {
                id: 'pad_block_york_leg',
                name: 'Smother & Pad Defense',
                targetZone: 'square_leg',
                alternativeZone: 'mid_on',
                category: 'Defensive',
                riskBase: 12,
                powerBase: 18,
                boundaryBase: 0,
                description: 'Smothering the ball against the pad line with solid bat face.',
                dismissalMode: 'LBW if pad struck first',
                colorCode: '#64748b',
                isAerial: false
            },
            {
                id: 'heave_deep_midwicket_york_leg',
                name: 'Full-Toss Heave to Deep Midwicket',
                targetZone: 'mid_wicket',
                alternativeZone: 'square_leg',
                category: 'Lofted',
                riskBase: 52,
                powerBase: 94,
                boundaryBase: 78,
                description: 'Swinging across the line with ferocious leverage into deep midwicket crowd.',
                dismissalMode: 'Caught at Deep Midwicket fence',
                colorCode: '#8b5cf6',
                isAerial: true
            }
        ]
    }
};

export const WAGON_WHEEL_ZONES: Record<WagonZoneId, {
    id: WagonZoneId;
    name: string;
    shortName: string;
    angleStart: number;
    angleEnd: number;
    midAngle: number;
    colorCode: string;
    side: 'off' | 'on';
}> = {
    'third_man': { id: 'third_man', name: 'Third Man', shortName: '3rd Man', angleStart: 310, angleEnd: 360, midAngle: 335, colorCode: '#f59e0b', side: 'off' },
    'point': { id: 'point', name: 'Point / Backward Point', shortName: 'Point', angleStart: 260, angleEnd: 310, midAngle: 285, colorCode: '#0284c7', side: 'off' },
    'cover': { id: 'cover', name: 'Cover / Extra Cover', shortName: 'Cover', angleStart: 210, angleEnd: 260, midAngle: 235, colorCode: '#0d9488', side: 'off' },
    'mid_off': { id: 'mid_off', name: 'Mid-Off / Long-Off', shortName: 'Mid-Off', angleStart: 180, angleEnd: 210, midAngle: 195, colorCode: '#14b8a6', side: 'off' },
    'mid_on': { id: 'mid_on', name: 'Mid-On / Long-On', shortName: 'Mid-On', angleStart: 140, angleEnd: 180, midAngle: 160, colorCode: '#10b981', side: 'on' },
    'mid_wicket': { id: 'mid_wicket', name: 'Midwicket / Deep Midwicket', shortName: 'Midwicket', angleStart: 100, angleEnd: 140, midAngle: 120, colorCode: '#f43f5e', side: 'on' },
    'square_leg': { id: 'square_leg', name: 'Square Leg / Deep Square', shortName: 'Sq. Leg', angleStart: 50, angleEnd: 100, midAngle: 75, colorCode: '#8b5cf6', side: 'on' },
    'fine_leg': { id: 'fine_leg', name: 'Fine Leg / Deep Fine', shortName: 'Fine Leg', angleStart: 0, angleEnd: 50, midAngle: 25, colorCode: '#ec4899', side: 'on' },
};

interface ShotSelectionWagonWheelProps {
    gameData?: GameData;
    initialBatter?: Player | null;
    onBack?: () => void;
}

export const ShotSelectionWagonWheel: React.FC<ShotSelectionWagonWheelProps> = ({
    gameData,
    initialBatter,
    onBack
}) => {
    // Delivery Selection Coordinates
    const [selectedLength, setSelectedLength] = useState<LengthZoneId>('good');
    const [selectedLine, setSelectedLine] = useState<LineZoneId>('off');
    const [selectedShotId, setSelectedShotId] = useState<string>('cover_drive_good_off');

    // Batter Customization & Matchup Simulator State
    const [isLeftHanded, setIsLeftHanded] = useState<boolean>(false);
    const [batterStyle, setBatterStyle] = useState<BattingStyle>(initialBatter?.style || 'A');
    const [batterSkill, setBatterSkill] = useState<number>(initialBatter?.battingSkill || 85);
    const [bowlerType, setBowlerType] = useState<'fb' | 'fbs' | 'os' | 'ls' | 'lac' | 'm'>('fb');
    const [bowlerSkill, setBowlerSkill] = useState<number>(82);

    // Batter picker from GameData if available
    const [selectedBatterId, setSelectedBatterId] = useState<string>(initialBatter?.id || '');

    // Interactive Field Placement State for the 8 zones
    const [fielders, setFielders] = useState<Record<WagonZoneId, FielderPositionType>>({
        'third_man': 'deep',
        'point': 'ring',
        'cover': 'ring',
        'mid_off': 'ring',
        'mid_on': 'ring',
        'mid_wicket': 'deep',
        'square_leg': 'deep',
        'fine_leg': 'deep',
    });

    const activeZoneKey: `${LengthZoneId}_${LineZoneId}` = `${selectedLength}_${selectedLine}`;
    const activeDeliveryZone = BOWLING_DELIVERY_MATRIX[activeZoneKey];

    // Ensure selected shot matches current delivery zone
    const currentShot = useMemo(() => {
        const found = activeDeliveryZone.shots.find(s => s.id === selectedShotId);
        if (found) return found;
        return activeDeliveryZone.shots[0];
    }, [activeDeliveryZone, selectedShotId]);

    // Handle batter selection
    const handleSelectBatter = (player: Player) => {
        setSelectedBatterId(player.id);
        setBatterSkill(player.battingSkill);
        setBatterStyle(player.style);
        playSFX('click');
    };

    // Quick Field Presets
    const applyFieldPreset = (preset: 'standard' | 'powerplay' | 'death' | 'offside' | 'legside') => {
        playSFX('click');
        switch (preset) {
            case 'standard':
                setFielders({
                    'third_man': 'deep',
                    'point': 'ring',
                    'cover': 'ring',
                    'mid_off': 'ring',
                    'mid_on': 'ring',
                    'mid_wicket': 'deep',
                    'square_leg': 'deep',
                    'fine_leg': 'deep',
                });
                break;
            case 'powerplay': // 2 Deep, 7 Ring/Infield
                setFielders({
                    'third_man': 'deep',
                    'point': 'ring',
                    'cover': 'ring',
                    'mid_off': 'ring',
                    'mid_on': 'ring',
                    'mid_wicket': 'ring',
                    'square_leg': 'deep',
                    'fine_leg': 'open',
                });
                break;
            case 'death': // 5 Deep Boundary riders
                setFielders({
                    'third_man': 'deep',
                    'point': 'deep',
                    'cover': 'deep',
                    'mid_off': 'ring',
                    'mid_on': 'ring',
                    'mid_wicket': 'deep',
                    'square_leg': 'deep',
                    'fine_leg': 'ring',
                });
                break;
            case 'offside': // 6-3 Offside pack
                setFielders({
                    'third_man': 'deep',
                    'point': 'ring',
                    'cover': 'ring',
                    'mid_off': 'ring',
                    'mid_on': 'ring',
                    'mid_wicket': 'open',
                    'square_leg': 'ring',
                    'fine_leg': 'deep',
                });
                break;
            case 'legside': // Leg-side trap
                setFielders({
                    'third_man': 'open',
                    'point': 'ring',
                    'cover': 'ring',
                    'mid_off': 'open',
                    'mid_on': 'ring',
                    'mid_wicket': 'deep',
                    'square_leg': 'deep',
                    'fine_leg': 'deep',
                });
                break;
        }
    };

    const toggleFielder = (zoneId: WagonZoneId) => {
        playSFX('click');
        setFielders(prev => {
            const current = prev[zoneId];
            const next: FielderPositionType = current === 'open' ? 'ring' : current === 'ring' ? 'deep' : 'open';
            return { ...prev, [zoneId]: next };
        });
    };

    // Calculate Analytics: Run Allocation Ratio %, Dismissal Risk %, Boundary %, Dot %, Single %
    const analytics = useMemo(() => {
        const shot = currentShot;
        const targetZone = shot.targetZone;
        const targetFielderState = fielders[targetZone];

        // Skill Modifiers
        const batterSkillBonus = (batterSkill - 75) * 0.4;
        const bowlerSkillBonus = (bowlerSkill - 75) * 0.4;
        const styleAggression = batterStyle === 'A' ? 1.15 : batterStyle === 'D' ? 0.85 : 1.0;

        // Base Power & Boundary Chance
        let rawRunAllocation = shot.powerBase * (styleAggression * 0.5 + 0.5) + batterSkillBonus - bowlerSkillBonus;
        let rawDismissalRisk = shot.riskBase * (batterStyle === 'A' ? 1.2 : batterStyle === 'D' ? 0.75 : 1.0) + bowlerSkillBonus - batterSkillBonus;
        let boundaryProbability = shot.boundaryBase * styleAggression + batterSkillBonus;

        // Dynamic Field Impact
        if (targetFielderState === 'deep') {
            // Deep boundary rider cuts down runs & boundaries, increases catch risk for aerial shots
            rawRunAllocation *= 0.65;
            boundaryProbability *= 0.35;
            if (shot.isAerial) {
                rawDismissalRisk *= 1.85; // High catch risk at the fence!
            } else {
                rawDismissalRisk *= 1.15; // Runout risk on 2nd run
            }
        } else if (targetFielderState === 'ring') {
            // Ring fielder cuts off singles & stops grounded drives, increases ring catch risk
            rawRunAllocation *= 0.80;
            boundaryProbability *= 0.75;
            if (!shot.isAerial) {
                rawDismissalRisk *= 1.45; // Sharp catch in covers/ring
            } else {
                rawDismissalRisk *= 0.95; // Aerially cleared the 30-yard circle!
            }
        } else {
            // Open Gap! Big run opportunity!
            rawRunAllocation *= 1.25;
            boundaryProbability *= 1.30;
            rawDismissalRisk *= 0.65; // Safe into the vacant pocket
        }

        // Clamp outputs to realistic percentages
        const finalRunAllocation = Math.max(8, Math.min(95, Math.round(rawRunAllocation)));
        const finalDismissalRisk = Math.max(3, Math.min(88, Math.round(rawDismissalRisk)));
        const finalBoundaryProb = Math.max(0, Math.min(90, Math.round(boundaryProbability)));
        const finalDotProb = Math.max(5, Math.min(80, Math.round(100 - finalRunAllocation * 0.8 - finalBoundaryProb * 0.4)));
        const finalSingleProb = Math.max(5, 100 - finalBoundaryProb - finalDotProb);

        // Danger Classification
        let riskLevel: 'Safe' | 'Moderate' | 'Dangerous' | 'Extreme';
        let riskColor: string;
        if (finalDismissalRisk <= 18) {
            riskLevel = 'Safe';
            riskColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
        } else if (finalDismissalRisk <= 35) {
            riskLevel = 'Moderate';
            riskColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
        } else if (finalDismissalRisk <= 55) {
            riskLevel = 'Dangerous';
            riskColor = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
        } else {
            riskLevel = 'Extreme';
            riskColor = 'text-red-400 border-red-500/30 bg-red-500/10';
        }

        return {
            runAllocationRatio: finalRunAllocation,
            dismissalRisk: finalDismissalRisk,
            boundaryProbability: finalBoundaryProb,
            dotProbability: finalDotProb,
            singleProbability: finalSingleProb,
            riskLevel,
            riskColor,
            targetFielderState
        };
    }, [currentShot, fielders, batterSkill, batterStyle, bowlerSkill, bowlerType]);

    // Available batters list from user squad or allPlayers
    const squadBatters = useMemo(() => {
        if (!gameData) return [];
        return gameData.allPlayers.filter(p => 
            p.role === PlayerRole.BATSMAN || p.role === PlayerRole.ALL_ROUNDER || p.role === PlayerRole.WICKET_KEEPER
        ).slice(0, 12);
    }, [gameData]);

    // Count fielded positions
    const fielderCounts = useMemo(() => {
        let ring = 0;
        let deep = 0;
        let open = 0;
        Object.values(fielders).forEach(f => {
            if (f === 'ring') ring++;
            else if (f === 'deep') deep++;
            else open++;
        });
        return { ring, deep, open };
    }, [fielders]);

    // Compute Wagon Wheel Target Angle (mirrored if Left-Handed)
    const targetWagonZone = WAGON_WHEEL_ZONES[currentShot.targetZone];
    const rawAngle = targetWagonZone.midAngle;
    // Mirror angle horizontally across the pitch if LHB (y stays, x flips: angle -> 180 - angle)
    const wagonAngle = isLeftHanded ? (180 - rawAngle + 360) % 360 : rawAngle;
    const rad = (wagonAngle * Math.PI) / 180;
    const targetX = 150 + Math.cos(rad) * (currentShot.isAerial ? 112 : 92);
    const targetY = 150 + Math.sin(rad) * (currentShot.isAerial ? 112 : 92);

    return (
        <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto px-2 sm:px-4">
            {/* Header / Module Bar */}
            <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={() => { playSFX('click'); onBack(); }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/30">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                                Shot Selection & Wagon Wheel
                            </h2>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                                BATTING LAB
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Satellite Ground Analysis for Batter Execution, Wagon Wheel Vectors & Defensive Traps
                        </p>
                    </div>
                </div>

                {/* Matchup Quick Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => { playSFX('click'); setIsLeftHanded(!isLeftHanded); }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1.5 ${
                            isLeftHanded 
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isLeftHanded ? 'LHB (Left Hand)' : 'RHB (Right Hand)'}</span>
                    </button>

                    <div className="flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
                        {(['A', 'N', 'D'] as BattingStyle[]).map(style => (
                            <button
                                key={style}
                                onClick={() => { playSFX('click'); setBatterStyle(style); }}
                                className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all ${
                                    batterStyle === style
                                        ? 'bg-teal-500 text-slate-950 shadow'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {style === 'A' ? 'Aggressive' : style === 'D' ? 'Defensive' : 'Balanced'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Interactive Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: 4x3 Bowling Delivery Coordinate Pitch Matrix (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-cyan-400" />
                                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                                    Bowler Delivery Zone
                                </h3>
                            </div>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                                {activeDeliveryZone.lengthLabel} • {activeDeliveryZone.lineLabel}
                            </span>
                        </div>

                        {/* Interactive 4x3 Coordinate Grid Canvas */}
                        <div className="space-y-3">
                            <p className="text-[11px] text-slate-400 font-mono">
                                Select where the bowler pitches the ball on the turf grid:
                            </p>

                            {/* Length Selector Tabs */}
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                {[
                                    { id: 'yorker' as LengthZoneId, label: 'Yorker / Toss', color: 'border-red-500/40 text-red-400 bg-red-950/20' },
                                    { id: 'full' as LengthZoneId, label: 'Full Length', color: 'border-indigo-500/40 text-indigo-400 bg-indigo-950/20' },
                                    { id: 'good' as LengthZoneId, label: 'Good Length', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20' },
                                    { id: 'short' as LengthZoneId, label: 'Short Pitch', color: 'border-amber-500/40 text-amber-400 bg-amber-950/20' },
                                ].map(len => (
                                    <button
                                        key={len.id}
                                        onClick={() => { playSFX('click'); setSelectedLength(len.id); }}
                                        className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                            selectedLength === len.id
                                                ? 'bg-white text-slate-950 font-black border-white shadow-lg scale-[1.02]'
                                                : `hover:bg-slate-800 ${len.color}`
                                        }`}
                                    >
                                        {len.label}
                                    </button>
                                ))}
                            </div>

                            {/* Line Selector Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'off' as LineZoneId, label: isLeftHanded ? 'Off (Left side)' : 'Off Stump (Corridor)', desc: 'Outside 4th-5th Stump' },
                                    { id: 'middle' as LineZoneId, label: 'Middle Stump', desc: 'At the Stumps' },
                                    { id: 'leg' as LineZoneId, label: isLeftHanded ? 'Leg (Right side)' : 'Leg Stump / Pads', desc: 'Down the Body' },
                                ].map(line => (
                                    <button
                                        key={line.id}
                                        onClick={() => { playSFX('click'); setSelectedLine(line.id); }}
                                        className={`p-2.5 rounded-xl border text-center transition-all ${
                                            selectedLine === line.id
                                                ? 'bg-teal-500 border-teal-400 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                                                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="text-xs font-bold">{line.label}</div>
                                        <div className={`text-[9px] font-mono ${selectedLine === line.id ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                                            {line.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Visual 2D Cricket Pitch Strip with Stumps and Landing Markers */}
                            <div className="relative h-44 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden flex items-center justify-center">
                                <svg viewBox="0 0 240 160" className="w-full h-full select-none">
                                    {/* Turf Pitch Mat */}
                                    <polygon points="40,150 70,10 170,10 200,150" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                                    
                                    {/* Crease Lines */}
                                    <line x1="60" y1="35" x2="180" y2="35" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
                                    <line x1="45" y1="130" x2="195" y2="130" stroke="#94a3b8" strokeWidth="2" />
                                    
                                    {/* Center Stumps (Batsman End) */}
                                    <g transform="translate(108, 130)">
                                        <rect x="0" y="0" width="5" height="16" fill="#f87171" rx="1" />
                                        <rect x="10" y="0" width="5" height="16" fill="#ef4444" rx="1" />
                                        <rect x="20" y="0" width="5" height="16" fill="#f87171" rx="1" />
                                        <rect x="-1" y="-2" width="27" height="3" fill="#cbd5e1" rx="0.5" />
                                    </g>

                                    {/* 4 Pitch Length Zones */}
                                    {[
                                        { len: 'short' as LengthZoneId, y: 35, h: 25, label: 'Short Pitch Bouncer', fill: '#eab308' },
                                        { len: 'good' as LengthZoneId, y: 60, h: 30, label: 'Good Length (Corridor)', fill: '#10b981' },
                                        { len: 'full' as LengthZoneId, y: 90, h: 25, label: 'Full Half-Volley', fill: '#6366f1' },
                                        { len: 'yorker' as LengthZoneId, y: 115, h: 18, label: 'Yorker / Full Toss', fill: '#ef4444' },
                                    ].map(zone => {
                                        const isLenActive = selectedLength === zone.len;
                                        return (
                                            <g key={zone.len} className="cursor-pointer" onClick={() => { playSFX('click'); setSelectedLength(zone.len); }}>
                                                <rect
                                                    x="55"
                                                    y={zone.y}
                                                    width="130"
                                                    height={zone.h}
                                                    fill={isLenActive ? zone.fill : `${zone.fill}18`}
                                                    stroke={zone.fill}
                                                    strokeWidth={isLenActive ? 2 : 0.5}
                                                    rx="3"
                                                    className="transition-all duration-200"
                                                />
                                                <text
                                                    x="120"
                                                    y={zone.y + zone.h / 2 + 3}
                                                    fill={isLenActive ? '#0f172a' : '#94a3b8'}
                                                    fontSize="7px"
                                                    fontWeight="bold"
                                                    fontFamily="sans-serif"
                                                    textAnchor="middle"
                                                    className="pointer-events-none uppercase tracking-wider"
                                                >
                                                    {zone.label}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Line Crosshair Target Pointer */}
                                    {(() => {
                                        const yMap: Record<LengthZoneId, number> = { short: 47, good: 75, full: 102, yorker: 124 };
                                        const xMap: Record<LineZoneId, number> = isLeftHanded
                                            ? { off: 85, middle: 120, leg: 155 }
                                            : { off: 155, middle: 120, leg: 85 };
                                        const px = xMap[selectedLine];
                                        const py = yMap[selectedLength];

                                        return (
                                            <g transform={`translate(${px}, ${py})`}>
                                                <circle r="9" fill="none" stroke="#22d3ee" strokeWidth="2" className="animate-ping" opacity="0.6" />
                                                <circle r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                                                <line x1="-8" y1="0" x2="8" y2="0" stroke="#fff" strokeWidth="1" />
                                                <line x1="0" y1="-8" x2="0" y2="8" stroke="#fff" strokeWidth="1" />
                                            </g>
                                        );
                                    })()}
                                </svg>
                            </div>
                        </div>

                        {/* Batter Shot Selection Cards (3-4 Shot options matching delivery) */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Matching Batter Shots ({activeDeliveryZone.shots.length} Available)
                                </span>
                                <span className="text-[9px] font-mono text-teal-400">
                                    Click card to select execution
                                </span>
                            </div>

                            <div className="space-y-2">
                                {activeDeliveryZone.shots.map((shot) => {
                                    const isSelected = currentShot.id === shot.id;
                                    const targetZoneData = WAGON_WHEEL_ZONES[shot.targetZone];
                                    return (
                                        <div
                                            key={shot.id}
                                            onClick={() => { playSFX('stroke'); setSelectedShotId(shot.id); }}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                                                isSelected
                                                    ? 'bg-slate-800 border-teal-400 ring-1 ring-teal-400/50 shadow-lg scale-[1.01]'
                                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: shot.colorCode }}
                                                    />
                                                    <div>
                                                        <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                                                            {shot.name}
                                                            {shot.isAerial && (
                                                                <span className="text-[8px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/40 px-1.5 py-0.2 rounded uppercase">
                                                                    Aerial Loft
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-mono">
                                                            Target Sector: <span className="text-teal-400 font-bold">{targetZoneData.name}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                                        shot.category === 'Attacking'
                                                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                                            : shot.category === 'Lofted'
                                                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                                                            : shot.category === 'Placement'
                                                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                                            : 'bg-slate-700 text-slate-300 border-slate-600'
                                                    }`}>
                                                        {shot.category}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed font-sans">
                                                {shot.description}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER / RIGHT COLUMN: Wagon Wheel Graphic & Real-Time Analytics (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                    
                    {/* Top Analytics Panel (Matching Satellite Ground Analysis Style) */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                            <div>
                                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">
                                    Active Shot Telemetry & Evaluation
                                </span>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    {currentShot.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase font-mono border ${analytics.riskColor}`}>
                                    Risk: {analytics.riskLevel} ({analytics.dismissalRisk}%)
                                </span>
                            </div>
                        </div>

                        {/* Primary Metric Badges Row (Run Allocation Ratio & Est. Dismissal Risk) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* 1. Run Allocation Ratio */}
                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                                    Run Allocation Ratio
                                </span>
                                <span className="font-extrabold text-xl font-mono text-cyan-400">
                                    {analytics.runAllocationRatio}%
                                </span>
                                <span className="text-[9px] text-slate-500 block mt-0.5">
                                    {analytics.runAllocationRatio > 55 ? '🔥 High Yield' : '🛡️ Controlled Flow'}
                                </span>
                            </div>

                            {/* 2. Est. Dismissal Risk */}
                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                                    Est. Dismissal Risk
                                </span>
                                <span className="font-extrabold text-xl font-mono text-teal-400">
                                    {analytics.dismissalRisk}%
                                </span>
                                <span className="text-[9px] text-slate-500 block mt-0.5 truncate">
                                    {currentShot.dismissalMode.split(' ')[0]} Risk
                                </span>
                            </div>

                            {/* 3. Boundary Chance */}
                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                                    Boundary Chance (4/6)
                                </span>
                                <span className="font-extrabold text-xl font-mono text-amber-400">
                                    {analytics.boundaryProbability}%
                                </span>
                                <span className="text-[9px] text-slate-500 block mt-0.5">
                                    {analytics.boundaryProbability > 50 ? '💥 Fence Threat' : 'Single/Double'}
                                </span>
                            </div>

                            {/* 4. Target Gap Status */}
                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                                    Target Fielder State
                                </span>
                                <span className={`font-extrabold text-sm font-mono uppercase block mt-1 ${
                                    analytics.targetFielderState === 'deep' 
                                        ? 'text-red-400' 
                                        : analytics.targetFielderState === 'ring' 
                                        ? 'text-amber-400' 
                                        : 'text-emerald-400'
                                }`}>
                                    {analytics.targetFielderState === 'deep' ? '🛡️ Deep Fielder' : analytics.targetFielderState === 'ring' ? '🧤 30-Yd Ring' : '🟢 Open Gap!'}
                                </span>
                                <span className="text-[9px] text-slate-500 block">
                                    {WAGON_WHEEL_ZONES[currentShot.targetZone].shortName}
                                </span>
                            </div>
                        </div>

                        {/* Wagon Wheel SVG Graphic + Side Field Placement Panel */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
                            
                            {/* Graphic Canvas: Full Wagon Wheel (7 cols) */}
                            <div className="md:col-span-7 flex justify-center bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden">
                                <svg viewBox="0 0 300 300" className="w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] select-none">
                                    <defs>
                                        <radialGradient id="turfShine" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#166534" />
                                            <stop offset="85%" stopColor="#14532d" />
                                            <stop offset="100%" stopColor="#052e16" />
                                        </radialGradient>
                                        <filter id="glowCyanWagon">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {/* Outer Ground Turf Circle */}
                                    <circle cx="150" cy="150" r="140" fill="url(#turfShine)" stroke="#15803d" strokeWidth="3" />
                                    
                                    {/* Boundary Rope Line */}
                                    <circle cx="150" cy="150" r="126" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="5 4" opacity="0.9" />
                                    
                                    {/* Inner 30-Yard Circle */}
                                    <circle cx="150" cy="150" r="76" fill="none" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.65" />

                                    {/* Center Pitch */}
                                    <rect x="142" y="115" width="16" height="70" fill="#eab308" stroke="#ca8a04" strokeWidth="1" rx="2" />
                                    <line x1="142" y1="125" x2="158" y2="125" stroke="white" strokeWidth="1" />
                                    <line x1="142" y1="175" x2="158" y2="175" stroke="white" strokeWidth="1" />

                                    {/* Off / On Demarcation Axis */}
                                    <line x1="150" y1="10" x2="150" y2="290" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />

                                    {/* 8 Field Zones & Sector Indicator Nodes */}
                                    {Object.values(WAGON_WHEEL_ZONES).map((zone) => {
                                        const rawZoneAngle = zone.midAngle;
                                        const adjustedAngle = isLeftHanded ? (180 - rawZoneAngle + 360) % 360 : rawZoneAngle;
                                        const zoneRad = (adjustedAngle * Math.PI) / 180;
                                        const nodeX = 150 + Math.cos(zoneRad) * 122;
                                        const nodeY = 150 + Math.sin(zoneRad) * 122;

                                        const fielderState = fielders[zone.id];
                                        const isShotTarget = currentShot.targetZone === zone.id;

                                        return (
                                            <g key={zone.id}>
                                                {/* Connecting Ray */}
                                                <line
                                                    x1="150"
                                                    y1="150"
                                                    x2={nodeX}
                                                    y2={nodeY}
                                                    stroke={isShotTarget ? '#22d3ee' : 'rgba(255,255,255,0.12)'}
                                                    strokeWidth={isShotTarget ? 2.5 : 0.8}
                                                />

                                                {/* Zone Node Button */}
                                                <circle
                                                    cx={nodeX}
                                                    cy={nodeY}
                                                    r={isShotTarget ? 13 : 9}
                                                    fill={isShotTarget ? '#06b6d4' : fielderState === 'deep' ? '#f43f5e' : fielderState === 'ring' ? '#f59e0b' : 'rgba(15,23,42,0.85)'}
                                                    stroke="#ffffff"
                                                    strokeWidth={isShotTarget ? 2 : 1}
                                                    className="cursor-pointer transition-all duration-200 hover:scale-125"
                                                    onClick={() => toggleFielder(zone.id)}
                                                />

                                                {/* Fielder Symbol */}
                                                <text
                                                    x={nodeX}
                                                    y={nodeY + 3}
                                                    fill="#ffffff"
                                                    fontSize="7px"
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                    className="pointer-events-none select-none"
                                                >
                                                    {fielderState === 'deep' ? '🛡️' : fielderState === 'ring' ? '🧤' : '○'}
                                                </text>

                                                {/* Sector Short Label */}
                                                <text
                                                    x={nodeX}
                                                    y={nodeY + 13}
                                                    fill={isShotTarget ? '#22d3ee' : '#94a3b8'}
                                                    fontSize="6.5px"
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                    className="pointer-events-none"
                                                >
                                                    {zone.shortName}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Projected Ball Trajectory Vector & Impact Pulse */}
                                    <g>
                                        {/* Trajectory Laser */}
                                        <line
                                            x1="150"
                                            y1="150"
                                            x2={targetX}
                                            y2={targetY}
                                            stroke={currentShot.isAerial ? '#ec4899' : '#06b6d4'}
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            filter="url(#glowCyanWagon)"
                                        />

                                        {/* Target Landing Impact Ring */}
                                        <circle
                                            cx={targetX}
                                            cy={targetY}
                                            r="14"
                                            fill="none"
                                            stroke={currentShot.isAerial ? '#ec4899' : '#06b6d4'}
                                            strokeWidth="2"
                                            className="animate-ping"
                                        />
                                        <circle
                                            cx={targetX}
                                            cy={targetY}
                                            r="6"
                                            fill="#f87171"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                    </g>
                                </svg>

                                {/* Off-Side / On-Side Watermark Tags */}
                                <span className={`absolute top-2 text-[9px] font-black uppercase text-white/40 tracking-wider font-mono ${isLeftHanded ? 'right-3' : 'left-3'}`}>
                                    {isLeftHanded ? 'On-Side' : 'Off-Side'}
                                </span>
                                <span className={`absolute top-2 text-[9px] font-black uppercase text-white/40 tracking-wider font-mono ${isLeftHanded ? 'left-3' : 'right-3'}`}>
                                    {isLeftHanded ? 'Off-Side' : 'On-Side'}
                                </span>
                            </div>

                            {/* Interactive Field Placement Panel (5 cols) */}
                            <div className="md:col-span-5 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-amber-400" />
                                        <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                                            Field Deployment
                                        </h4>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400">
                                        {fielderCounts.ring} Ring • {fielderCounts.deep} Deep
                                    </span>
                                </div>

                                <p className="text-[10px] text-slate-400 font-mono">
                                    Click sector nodes to cycle [Open → 30yd Ring → Deep Fence]:
                                </p>

                                {/* 8 Zone Toggle Matrix */}
                                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                    {Object.values(WAGON_WHEEL_ZONES).map((z) => {
                                        const pos = fielders[z.id];
                                        const isTarget = currentShot.targetZone === z.id;
                                        return (
                                            <button
                                                key={z.id}
                                                onClick={() => toggleFielder(z.id)}
                                                className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                    isTarget
                                                        ? 'bg-slate-800 border-teal-400 text-white ring-1 ring-teal-400/40'
                                                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-850'
                                                }`}
                                            >
                                                <div>
                                                    <div className="text-[10px] font-bold truncate flex items-center gap-1">
                                                        {isTarget && <span className="text-teal-400">🎯</span>}
                                                        {z.shortName}
                                                    </div>
                                                    <div className={`text-[9px] font-mono uppercase font-bold ${
                                                        pos === 'deep' ? 'text-red-400' : pos === 'ring' ? 'text-amber-400' : 'text-emerald-400'
                                                    }`}>
                                                        {pos === 'deep' ? '🛡️ Deep' : pos === 'ring' ? '🧤 Ring' : '○ Open'}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Preset Strategies */}
                                <div className="pt-2 border-t border-slate-800">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Fielding Tactics Presets
                                    </span>
                                    <div className="grid grid-cols-3 gap-1 text-center">
                                        <button
                                            onClick={() => applyFieldPreset('standard')}
                                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold"
                                        >
                                            Standard
                                        </button>
                                        <button
                                            onClick={() => applyFieldPreset('powerplay')}
                                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold"
                                        >
                                            Powerplay
                                        </button>
                                        <button
                                            onClick={() => applyFieldPreset('death')}
                                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold"
                                        >
                                            Death Fence
                                        </button>
                                        <button
                                            onClick={() => applyFieldPreset('offside')}
                                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold"
                                        >
                                            Offside Pack
                                        </button>
                                        <button
                                            onClick={() => applyFieldPreset('legside')}
                                            className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold col-span-2"
                                        >
                                            Leg-Side Trap
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tactical Scout Commentary Quote */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-cyan-950/40 border border-teal-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Award className="w-4 h-4 text-teal-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-teal-300">
                                    Tactical Execution Analysis
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed italic font-mono">
                                "{currentShot.name} against {activeDeliveryZone.lengthLabel} ({activeDeliveryZone.lineLabel}) offers a {analytics.runAllocationRatio}% scoring yield. {
                                    analytics.targetFielderState === 'deep'
                                        ? `Warning: Deep fielder stationed at ${WAGON_WHEEL_ZONES[currentShot.targetZone].name} raises dismissal risk to ${analytics.dismissalRisk}%. Recommend rotating strike or keeping ground contact.`
                                        : analytics.targetFielderState === 'ring'
                                        ? `Infield ring fielder at ${WAGON_WHEEL_ZONES[currentShot.targetZone].name} guards single. High elevation or soft push required to penetrate.`
                                        : `Gaps wide open at ${WAGON_WHEEL_ZONES[currentShot.targetZone].name}! Prime boundary opportunity with minimal danger.`
                                }"
                            </p>
                        </div>
                    </div>

                    {/* Batter Matchup & Skill Calibration Accordion */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-teal-400" />
                                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                                    Matchup Calibration & Batter Archetype
                                </h3>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                                Skill & Bowler Parameters
                            </span>
                        </div>

                        {/* Batter Selection from Squad if available */}
                        {squadBatters.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                                    Select Batter from Squad Roster
                                </span>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {squadBatters.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelectBatter(p)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                selectedBatterId === p.id
                                                    ? 'bg-teal-500 border-teal-400 text-slate-950 font-black'
                                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                                            }`}
                                        >
                                            {p.name} ({p.battingSkill})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sliders: Batter Skill vs Bowler Skill */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-slate-400">Batter Execution Skill</span>
                                    <span className="text-teal-400 font-bold">{batterSkill} / 99</span>
                                </div>
                                <input
                                    type="range"
                                    min="40"
                                    max="99"
                                    value={batterSkill}
                                    onChange={(e) => setBatterSkill(Number(e.target.value))}
                                    className="w-full accent-teal-400 cursor-pointer"
                                />
                            </div>

                            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-slate-400">Bowler Accuracy / Control</span>
                                    <span className="text-cyan-400 font-bold">{bowlerSkill} / 99</span>
                                </div>
                                <input
                                    type="range"
                                    min="40"
                                    max="99"
                                    value={bowlerSkill}
                                    onChange={(e) => setBowlerSkill(Number(e.target.value))}
                                    className="w-full accent-cyan-400 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default ShotSelectionWagonWheel;
