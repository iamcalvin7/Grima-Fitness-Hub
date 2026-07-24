/**
 * BodyMap — interactive anatomical muscle-group selector.
 *
 * SVG polygon data is sourced from the `body-highlighter` npm package
 * (MIT License, Copyright © 2020 GV79). See ANATOMY_ASSET_LICENSE.md.
 *
 * Modifications: re-styled for dark brand palette; muscle groups re-mapped
 * to this app's MuscleId type; interactive selection and chip UI added.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ────────────────────────────────────────────────────────────────── */

export type BodyView = 'front' | 'back';

export type MuscleId =
  | 'chest'
  | 'front_deltoids'
  | 'rear_deltoids'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'trapezius'
  | 'upper_back'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'quadriceps'
  | 'adductors'
  | 'hamstrings'
  | 'tibialis'
  | 'calves';

export interface BodyMapProps {
  /** Muscle names from workout data that are auto-highlighted (display mode). */
  musclesWorked?: string[];
  /** Allow tapping muscles to toggle selection interactively. */
  interactive?: boolean;
  /** Controlled selected muscles (interactive mode). */
  selectedMuscles?: MuscleId[];
  /** Called when a muscle is toggled (interactive mode). */
  onMuscleToggle?: (id: MuscleId) => void;
  /** Called when the view changes. */
  onViewChange?: (view: BodyView) => void;
}

/* ── Muscle configuration ─────────────────────────────────────────────────── */

interface MuscleConfig {
  label: string;
  /** IDs used by the body-highlighter polygon data for the front view. */
  frontPolygonIds: string[];
  /** IDs used by the body-highlighter polygon data for the back view. */
  backPolygonIds: string[];
}

const MUSCLE_CONFIG: Record<MuscleId, MuscleConfig> = {
  chest:         { label: 'Chest',       frontPolygonIds: ['chest'],           backPolygonIds: [] },
  front_deltoids:{ label: 'Shoulders',   frontPolygonIds: ['front-deltoids'],  backPolygonIds: [] },
  rear_deltoids: { label: 'Rear Delts',  frontPolygonIds: [],                  backPolygonIds: ['back-deltoids'] },
  biceps:        { label: 'Biceps',      frontPolygonIds: ['biceps'],          backPolygonIds: [] },
  triceps:       { label: 'Triceps',     frontPolygonIds: ['triceps'],         backPolygonIds: ['triceps'] },
  forearms:      { label: 'Forearms',    frontPolygonIds: ['forearm'],         backPolygonIds: ['forearm'] },
  abs:           { label: 'Abs',         frontPolygonIds: ['abs'],             backPolygonIds: [] },
  obliques:      { label: 'Obliques',    frontPolygonIds: ['obliques'],        backPolygonIds: [] },
  trapezius:     { label: 'Traps',       frontPolygonIds: [],                  backPolygonIds: ['trapezius'] },
  upper_back:    { label: 'Upper Back',  frontPolygonIds: [],                  backPolygonIds: ['upper-back'] },
  lats:          { label: 'Lats',        frontPolygonIds: [],                  backPolygonIds: ['upper-back'] },
  lower_back:    { label: 'Lower Back',  frontPolygonIds: [],                  backPolygonIds: ['lower-back'] },
  glutes:        { label: 'Glutes',      frontPolygonIds: [],                  backPolygonIds: ['gluteal'] },
  quadriceps:    { label: 'Quads',       frontPolygonIds: ['quadriceps'],      backPolygonIds: [] },
  adductors:     { label: 'Adductors',   frontPolygonIds: ['adductor'],        backPolygonIds: [] },
  hamstrings:    { label: 'Hamstrings',  frontPolygonIds: [],                  backPolygonIds: ['hamstring'] },
  tibialis:      { label: 'Tibialis',    frontPolygonIds: ['abductors'],       backPolygonIds: [] },
  calves:        { label: 'Calves',      frontPolygonIds: ['calves', 'left-soleus', 'right-soleus'], backPolygonIds: ['calves', 'left-soleus', 'right-soleus'] },
};

/* ── Workout term → MuscleId mapping ─────────────────────────────────────── */

const WORKOUT_MAP: Record<string, MuscleId[]> = {
  'CHEST':       ['chest'],
  'PECS':        ['chest'],
  'SHOULDERS':   ['front_deltoids', 'rear_deltoids'],
  'DELTS':       ['front_deltoids', 'rear_deltoids'],
  'FRONT DELTS': ['front_deltoids'],
  'REAR DELTS':  ['rear_deltoids'],
  'BICEPS':      ['biceps'],
  'TRICEPS':     ['triceps'],
  'FOREARMS':    ['forearms'],
  'BACK':        ['upper_back', 'lats', 'trapezius'],
  'TRAPS':       ['trapezius'],
  'LATS':        ['lats'],
  'UPPER BACK':  ['upper_back', 'trapezius'],
  'LOWER BACK':  ['lower_back'],
  'ABS':         ['abs'],
  'CORE':        ['abs', 'obliques', 'lower_back'],
  'OBLIQUES':    ['obliques'],
  'LEGS':        ['quadriceps', 'hamstrings', 'calves', 'glutes'],
  'QUADS':       ['quadriceps'],
  'QUADRICEPS':  ['quadriceps'],
  'HAMSTRINGS':  ['hamstrings'],
  'GLUTES':      ['glutes'],
  'CALVES':      ['calves'],
  'TIBIALIS':    ['tibialis'],
  'ADDUCTORS':   ['adductors'],
};

/* ── SVG polygon data (MIT License — body-highlighter, Copyright © 2020 GV79) */

// Each entry: { id: string (body-highlighter muscle id), points: string (SVG polygon points) }
interface PolygonDatum { id: string; points: string; }

const ANTERIOR_POLYGONS: PolygonDatum[] = [
  { id: 'chest', points: '51.8367347 41.6326531 51.0204082 55.1020408 57.9591837 57.9591837 67.755102 55.5102041 70.6122449 47.3469388 62.0408163 41.6326531' },
  { id: 'chest', points: '29.7959184 46.5306122 31.4285714 55.5102041 40.8163265 57.9591837 48.1632653 55.1020408 47.755102 42.0408163 37.5510204 42.0408163' },
  { id: 'obliques', points: '68.5714286 63.2653061 67.3469388 57.1428571 58.7755102 59.5918367 60 64.0816327 60.4081633 83.2653061 65.7142857 78.7755102 66.5306122 69.7959184' },
  { id: 'obliques', points: '33.877551 78.3673469 33.0612245 71.8367347 31.0204082 63.2653061 32.244898 57.1428571 40.8163265 59.1836735 39.1836735 63.2653061 39.1836735 83.6734694' },
  { id: 'abs', points: '56.3265306 59.1836735 57.9591837 64.0816327 58.3673469 77.9591837 58.3673469 92.6530612 56.3265306 98.3673469 55.1020408 104.081633 51.4285714 107.755102 51.0204082 84.4897959 50.6122449 67.3469388 51.0204082 57.1428571' },
  { id: 'abs', points: '43.6734694 58.7755102 48.5714286 57.1428571 48.9795918 67.3469388 48.5714286 84.4897959 48.1632653 107.346939 44.4897959 103.673469 40.8163265 91.4285714 40.8163265 78.3673469 41.2244898 64.4897959' },
  { id: 'biceps', points: '16.7346939 68.1632653 17.9591837 71.4285714 22.8571429 66.122449 28.9795918 53.877551 27.755102 49.3877551 20.4081633 55.9183673' },
  { id: 'biceps', points: '71.4285714 49.3877551 70.2040816 54.6938776 76.3265306 66.122449 81.6326531 71.8367347 82.8571429 68.9795918 78.7755102 55.5102041' },
  { id: 'triceps', points: '69.3877551 55.5102041 69.3877551 61.6326531 75.9183673 72.6530612 77.5510204 70.2040816 75.5102041 67.3469388' },
  { id: 'triceps', points: '22.4489796 69.3877551 29.7959184 55.5102041 29.7959184 60.8163265 22.8571429 73.0612245' },
  { id: 'neck', points: '55.5102041 23.6734694 50.6122449 33.4693878 50.6122449 39.1836735 61.6326531 40 70.6122449 44.8979592 69.3877551 36.7346939 63.2653061 35.1020408 58.3673469 30.6122449' },
  { id: 'neck', points: '28.9795918 44.8979592 30.2040816 37.1428571 36.3265306 35.1020408 41.2244898 30.2040816 44.4897959 24.4897959 48.9795918 33.877551 48.5714286 39.1836735 37.9591837 39.5918367' },
  { id: 'front-deltoids', points: '78.3673469 53.0612245 79.5918367 47.755102 79.1836735 41.2244898 75.9183673 37.9591837 71.0204082 36.3265306 72.244898 42.8571429 71.4285714 47.3469388' },
  { id: 'front-deltoids', points: '28.1632653 47.3469388 21.2244898 53.0612245 20 47.755102 20.4081633 40.8163265 24.4897959 37.1428571 28.5714286 37.1428571 26.9387755 43.2653061' },
  { id: 'head', points: '42.4489796 2.85714286 40 11.8367347 42.0408163 19.5918367 46.122449 23.2653061 49.7959184 25.3061224 54.6938776 22.4489796 57.5510204 19.1836735 59.1836735 10.2040816 57.1428571 2.44897959 49.7959184 0' },
  { id: 'abductors', points: '52.6530612 110.204082 54.2857143 124.897959 60 110.204082 62.0408163 100 64.8979592 94.2857143 60 92.6530612 56.7346939 104.489796' },
  { id: 'abductors', points: '47.755102 110.612245 44.8979592 125.306122 42.0408163 115.918367 40.4081633 113.061224 39.5918367 107.346939 37.9591837 102.44898 34.6938776 93.877551 39.5918367 92.244898 41.6326531 99.1836735 43.6734694 105.306122' },
  { id: 'quadriceps', points: '34.6938776 98.7755102 37.1428571 108.163265 37.1428571 127.755102 34.2857143 137.142857 31.0204082 132.653061 29.3877551 120 28.1632653 111.428571 29.3877551 100.816327 32.244898 94.6938776' },
  { id: 'quadriceps', points: '63.6734694 95.5102041 67.3469388 99.1836735 70.6122449 109.387755 69.3877551 119.183673 67.3469388 130.612245 64.4897959 137.142857 62.0408163 127.346939 62.4489796 109.387755 64.4897959 100' },
  { id: 'quadriceps', points: '39.5918367 93.4693878 42.0408163 90.6122449 44.0816327 89.3877551 46.9387755 92.244898 48.1632653 95.9183673 49.3877551 109.795918 47.755102 125.306122 45.7142857 131.428571 42.0408163 137.142857 40.4081633 132.244898 38.3673469 121.632653 38.7755102 107.755102' },
  { id: 'quadriceps', points: '54.2857143 89.3877551 56.3265306 88.9795918 58.3673469 91.0204082 61.2244898 93.877551 61.6326531 107.755102 61.2244898 121.632653 58.7755102 131.428571 57.1428571 137.142857 53.4693878 131.428571 51.4285714 125.306122 50.2040816 109.387755 50.6122449 95.5102041' },
  { id: 'adductor', points: '47.3469388 132.244898 46.1224490 138.367347 44.4897959 138.775510 43.2653061 141.020408 40.8163265 147.959184 42.0408163 154.693878 44.0816327 153.061224 48.5714286 138.775510 49.3877551 131.836735' },
  { id: 'adductor', points: '52.2448980 132.244898 53.4693878 138.775510 57.5510204 153.061224 59.1836735 154.693878 60.8163265 147.959184 58.7755102 141.020408 56.7346939 138.775510 55.1020408 138.367347' },
  { id: 'forearm', points: '14.2857143 74.6938776 19.5918367 76.3265306 22.8571429 74.6938776 28.5714286 60.4081633 28.1632653 54.6938776 22.0408163 67.3469388' },
  { id: 'forearm', points: '71.0204082 76.3265306 77.1428571 73.4693878 82.0408163 60.8163265 81.6326531 54.6938776 75.5102041 67.3469388 70.6122449 75.5102041' },
  { id: 'forearm', points: '12.2448980 80.0000000 17.5510204 84.4897959 22.0408163 77.5510204 17.1428571 74.2857143' },
  { id: 'forearm', points: '77.5510204 74.2857143 82.8571429 76.7346939 88.1632653 84.0816327 83.2653061 80.4081633' },
  { id: 'calves', points: '30.6122449 158.775510 30.2040816 165.306122 32.2448980 171.020408 32.6530612 184.897959 29.7959184 187.346939 25.3061224 176.326531 25.7142857 163.265306 27.3469388 158.775510' },
  { id: 'calves', points: '70.6122449 158.775510 72.2448980 163.265306 72.6530612 175.918367 68.5714286 187.346939 65.7142857 184.897959 66.1224490 171.428571 68.1632653 165.306122 69.3877551 158.775510' },
  { id: 'calves', points: '27.3469388 158.775510 31.4285714 157.142857 35.1020408 158.775510 34.2857143 172.244898 32.2448980 184.897959 28.9795918 190.204082 28.1632653 183.265306 31.8367347 173.061224' },
  { id: 'calves', points: '64.4897959 158.775510 68.9795918 157.142857 72.2448980 158.775510 70.2040816 173.061224 74.6938776 183.265306 73.4693878 190.204082 70.2040816 184.897959 68.5714286 172.244898' },
  { id: 'left-soleus', points: '27.7551020 191.020408 29.7959184 196.326531 29.7959184 205.714286 27.3469388 210.612245 25.3061224 205.306122 25.3061224 194.285714' },
  { id: 'right-soleus', points: '70.2040816 191.020408 74.6938776 194.285714 74.2857143 205.306122 72.2448980 210.612245 69.7959184 205.714286 70.2040816 196.326531' },
];

/* ── Base body silhouette paths (one per view) ───────────────────────────
 * One continuous outline tracing the full figure from head to feet, drawn
 * beneath all selectable muscle polygons. Coordinate space: 0-100 × 0-230.
 * Path goes clockwise: head → right arm → right leg → left leg → left arm.
 * ───────────────────────────────────────────────────────────────────────── */

const FRONT_SILHOUETTE =
  'M50,0 ' +
  'C56,0 61,5 61,12 C61,19 58,23 55,24 ' +                 // head right
  'C59,28 64,33 68,37 C74,40 82,43 83,51 ' +               // neck→right shoulder
  'C84,59 84,69 85,75 ' +                                   // right upper arm out
  'C87,80 89,95 91,108 C92,114 91,121 89,127 ' +           // right forearm out
  'C90,133 90,139 87,143 C84,145 79,146 76,143 ' +         // right hand/fingers
  'C74,140 73,135 73,128 C74,120 75,109 76,97 ' +          // right inner hand→arm
  'C76,86 75,77 73,70 C72,63 72,56 72,51 ' +               // right inner arm up
  'C70,55 69,63 69,74 C68,84 67,95 67,108 ' +              // right torso down
  'C68,115 70,123 71,132 ' +                                // right hip
  'C72,141 72,151 72,161 C72,170 70,179 68,186 ' +         // right thigh→knee
  'C67,196 66,208 65,217 ' +                                // right calf
  'C64,222 66,227 69,229 L78,231 ' +                        // right foot outer
  'C80,231 82,229 82,224 L82,220 ' +                        // right toes
  'C79,220 75,220 71,220 C69,225 67,228 65,225 ' +         // across toes→inner foot
  'C64,221 64,213 64,204 ' +                                // right inner ankle
  'C65,194 65,183 66,172 C66,162 66,152 67,145 ' +         // right inner calf→knee
  'C68,135 68,123 68,113 ' +                                // right inner thigh
  'C66,104 63,99 58,96 C55,95 45,95 42,96 C37,99 34,104 32,113 ' + // crotch arc
  'C32,123 32,135 33,145 C34,152 34,162 35,172 ' +         // left inner knee→calf
  'C35,183 35,194 36,204 C36,213 36,221 35,225 ' +         // left inner ankle
  'C33,228 31,225 29,220 L25,220 ' +                        // left inner foot
  'C21,220 18,220 18,224 L18,229 ' +                        // left toes
  'C20,231 22,231 31,231 L34,229 ' +                        // left foot outer
  'C36,227 36,222 35,217 ' +                                // left outer ankle
  'C34,208 33,196 32,186 C30,179 28,170 28,161 ' +         // left outer calf→knee
  'C28,151 29,141 30,132 C31,123 32,115 33,108 ' +         // left outer thigh
  'C33,95 32,84 31,74 C31,63 29,55 28,51 ' +               // left torso up
  'C27,56 27,63 27,70 C25,77 24,86 24,97 ' +               // left inner arm down
  'C25,109 26,120 27,128 C27,135 26,140 24,143 ' +         // left hand
  'C21,146 16,145 13,143 C10,139 10,133 11,127 ' +         // left fingers→hand outer
  'C9,121 8,114 9,108 ' +                                   // left wrist
  'C11,95 13,80 15,75 C16,69 16,59 17,51 ' +               // left forearm outer up
  'C18,43 26,40 32,37 C36,33 41,28 45,24 ' +               // left shoulder→neck
  'C42,23 39,19 39,12 C39,5 44,0 50,0Z';                   // head left→top

const BACK_SILHOUETTE =
  'M50,0 ' +
  'C56,0 61,5 61,12 C61,19 58,23 55,24 ' +
  'C59,28 64,33 69,37 C75,40 83,44 84,52 ' +               // slightly wider traps
  'C85,60 85,70 86,76 ' +
  'C88,81 90,96 92,109 C93,115 92,122 90,128 ' +
  'C91,134 91,140 88,144 C85,146 80,147 77,144 ' +
  'C75,141 74,136 74,129 C75,121 76,110 77,98 ' +
  'C77,87 76,78 74,71 C73,64 73,57 73,52 ' +
  'C71,56 70,64 70,75 C69,85 68,96 68,109 ' +
  'C69,116 71,124 72,133 ' +
  'C73,143 73,153 73,163 C73,172 71,180 69,187 ' +
  'C68,197 67,209 66,218 ' +
  'C65,223 67,228 70,230 L79,232 ' +
  'C81,232 83,230 83,225 L83,221 ' +
  'C80,221 76,221 72,221 C70,226 68,229 66,226 ' +
  'C65,222 65,214 65,205 ' +
  'C66,195 66,184 67,173 C67,163 67,153 68,146 ' +
  'C69,136 69,124 69,114 ' +
  'C67,105 64,100 59,97 C56,96 44,96 41,97 C36,100 33,105 31,114 ' +
  'C31,124 31,136 32,146 C33,153 33,163 33,173 ' +
  'C35,184 35,195 35,205 C35,214 35,222 34,226 ' +
  'C32,229 30,226 28,221 L24,221 ' +
  'C20,221 17,221 17,225 L17,230 ' +
  'C19,232 21,232 30,232 L33,230 ' +
  'C35,228 35,223 34,218 ' +
  'C33,209 32,197 31,187 C29,180 27,172 27,163 ' +
  'C27,153 27,143 28,133 C29,124 31,116 32,109 ' +
  'C32,96 31,85 30,75 C30,64 29,56 27,52 ' +
  'C27,57 26,64 24,71 C22,78 22,87 23,98 ' +
  'C24,110 25,121 26,129 C26,136 25,141 23,144 ' +
  'C20,147 15,146 12,144 C9,140 9,134 10,128 ' +
  'C8,122 7,115 8,109 ' +
  'C10,96 12,81 14,76 C15,70 15,60 16,52 ' +
  'C17,44 25,40 31,37 C36,33 41,28 45,24 ' +
  'C42,23 39,19 39,12 C39,5 44,0 50,0Z';

const POSTERIOR_POLYGONS: PolygonDatum[] = [
  { id: 'head', points: '50.6382979 0 45.9574468 0.85106383 40.8510638 5.53191489 40.4255319 12.7659574 45.106383 20 55.7446809 20 59.1489362 13.6170213 59.5744681 4.68085106 55.7446809 1.27659574' },
  { id: 'trapezius', points: '44.6808511 21.7021277 47.6595745 21.7021277 47.2340426 38.2978723 47.6595745 64.6808511 38.2978723 53.1914894 35.3191489 40.8510638 31.0638298 36.5957447 39.1489362 33.1914894 43.8297872 27.2340426' },
  { id: 'trapezius', points: '52.3404255 21.7021277 55.7446809 21.7021277 56.5957447 27.2340426 60.8510638 32.7659574 68.9361702 36.5957447 64.6808511 40.4255319 61.7021277 53.1914894 52.3404255 64.6808511 53.1914894 38.2978723' },
  { id: 'back-deltoids', points: '29.3617021 37.0212766 22.9787234 39.1489362 17.4468085 44.2553191 18.2978723 53.6170213 24.2553191 49.3617021 27.2340426 46.3829787' },
  { id: 'back-deltoids', points: '71.0638298 37.0212766 78.2978723 39.5744681 82.5531915 44.6808511 81.7021277 53.6170213 74.893617 48.9361702 72.3404255 45.106383' },
  { id: 'upper-back', points: '31.0638298 38.7234043 28.0851064 48.9361702 28.5106383 55.3191489 34.0425532 75.3191489 47.2340426 71.0638298 47.2340426 66.3829787 36.5957447 54.0425532 33.6170213 41.2765957' },
  { id: 'upper-back', points: '68.9361702 38.7234043 71.9148936 49.3617021 71.4893617 56.1702128 65.9574468 75.3191489 52.7659574 71.0638298 52.7659574 66.3829787 63.4042553 54.4680851 66.3829787 41.7021277' },
  { id: 'triceps', points: '26.8085106 49.787234 17.8723404 55.7446809 14.4680851 72.3404255 16.5957447 81.7021277 21.7021277 63.8297872 26.8085106 55.7446809' },
  { id: 'triceps', points: '73.6170213 50.212766 82.1276596 55.7446809 85.9574468 73.1914894 83.4042553 82.1276596 77.8723404 62.9787234 73.1914894 55.7446809' },
  { id: 'triceps', points: '26.8085106 58.2978723 26.8085106 68.5106383 22.9787234 75.3191489 19.1489362 77.4468085 22.5531915 65.5319149' },
  { id: 'triceps', points: '72.7659574 58.2978723 77.0212766 64.6808511 80.4255319 77.4468085 76.5957447 75.3191489 72.7659574 68.9361702' },
  { id: 'lower-back', points: '47.6595745 72.7659574 34.4680851 77.0212766 35.3191489 83.4042553 49.3617021 102.12766 46.8085106 82.9787234' },
  { id: 'lower-back', points: '52.3404255 72.7659574 65.5319149 77.0212766 64.6808511 83.4042553 50.6382979 102.12766 53.1914894 83.8297872' },
  { id: 'forearm', points: '86.3829787 75.7446809 91.0638298 83.4042553 93.1914894 94.0425532 100 106.382979 96.1702128 104.255319 88.0851064 89.3617021 84.2553191 83.8297872' },
  { id: 'forearm', points: '13.6170213 75.7446809 8.93617021 83.8297872 6.80851064 93.6170213 0 106.382979 3.82978723 104.255319 12.3404255 88.5106383 15.7446809 82.9787234' },
  { id: 'forearm', points: '81.2765957 79.5744681 77.4468085 77.8723404 79.1489362 84.6808511 91.0638298 103.829787 93.1914894 108.93617 94.4680851 104.680851' },
  { id: 'forearm', points: '18.7234043 79.5744681 22.1276596 77.8723404 20.8510638 84.2553191 9.36170213 102.978723 6.80851064 108.510638 5.10638298 104.680851' },
  { id: 'gluteal', points: '44.6808511 99.5744681 30.212766 108.510638 29.787234 118.723404 31.4893617 125.957447 47.2340426 121.276596 49.3617021 114.893617' },
  { id: 'gluteal', points: '55.3191489 99.1489362 51.0638298 114.468085 52.3404255 120.851064 68.0851064 125.957447 69.787234 119.148936 69.3617021 108.510638' },
  { id: 'adductor', points: '48.0851064 122.978723 44.6808511 122.978723 41.2765957 125.531915 45.106383 144.255319 48.5106383 135.744681 48.9361702 129.361702' },
  { id: 'adductor', points: '51.9148936 122.553191 55.7446809 123.404255 59.1489362 125.957447 54.893617 144.255319 51.9148936 136.170213 51.0638298 129.361702' },
  { id: 'hamstring', points: '28.9361702 122.12766 31.0638298 129.361702 36.5957447 125.957447 35.3191489 135.319149 34.4680851 150.212766 29.3617021 158.297872 28.9361702 146.808511 27.6595745 141.276596 27.2340426 131.489362' },
  { id: 'hamstring', points: '71.4893617 121.702128 69.3617021 128.93617 63.8297872 125.957447 65.5319149 136.595745 66.3829787 150.212766 71.0638298 158.297872 71.4893617 147.659574 72.7659574 142.12766 73.6170213 131.914894' },
  { id: 'hamstring', points: '38.7234043 125.531915 44.2553191 145.957447 40.4255319 166.808511 36.1702128 152.765957 37.0212766 135.319149' },
  { id: 'hamstring', points: '61.7021277 125.531915 63.4042553 136.170213 64.2553191 153.191489 60 166.808511 56.1702128 146.382979' },
  { id: 'knees', points: '34.4680851 153.191489 31.0638298 159.148936 33.6170213 166.382979 37.4468085 162.553191' },
  { id: 'knees', points: '66.3829787 153.617021 62.9787234 162.978723 66.8085106 166.382979 69.3617021 159.148936' },
  { id: 'calves', points: '29.3617021 160.425532 28.5106383 167.234043 24.6808511 179.574468 23.8297872 192.765957 25.5319149 197.021277 28.5106383 193.191489 29.787234 180 31.9148936 171.06383 31.9148936 166.808511' },
  { id: 'calves', points: '37.4468085 165.106383 35.3191489 167.659574 33.1914894 171.914894 31.0638298 180.425532 30.212766 191.914894 34.0425532 200 38.7234043 190.638298 39.1489362 168.93617' },
  { id: 'calves', points: '62.9787234 165.106383 61.2765957 168.510638 61.7021277 190.638298 66.3829787 199.574468 70.6382979 191.914894 68.9361702 179.574468 66.8085106 170.212766' },
  { id: 'calves', points: '70.6382979 160.425532 72.3404255 168.510638 75.7446809 179.148936 76.5957447 192.765957 74.4680851 196.595745 72.3404255 193.617021 70.6382979 179.574468 68.0851064 168.085106' },
  { id: 'left-soleus', points: '28.5106383 195.744681 30.212766 195.744681 33.6170213 201.702128 30.6382979 220 28.5106383 213.617021 26.8085106 198.297872' },
  { id: 'right-soleus', points: '69.787234 195.744681 71.9148936 195.744681 73.6170213 198.297872 71.9148936 213.191489 70.212766 219.574468 67.2340426 202.12766' },
];

/* ── Build a lookup: polygonId → set of MuscleIds that target it ─────────── */

function buildPolygonLookup(view: BodyView): Map<string, MuscleId[]> {
  const map = new Map<string, MuscleId[]>();
  (Object.entries(MUSCLE_CONFIG) as [MuscleId, MuscleConfig][]).forEach(([muscleId, cfg]) => {
    const ids = view === 'front' ? cfg.frontPolygonIds : cfg.backPolygonIds;
    ids.forEach(pid => {
      const existing = map.get(pid) ?? [];
      if (!existing.includes(muscleId)) existing.push(muscleId);
      map.set(pid, existing);
    });
  });
  return map;
}

/* ── Chips: which muscles to show (those that have paths in current view) ─── */

const FRONT_MUSCLE_ORDER: MuscleId[] = [
  'chest', 'front_deltoids', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quadriceps', 'adductors', 'tibialis', 'calves',
];
const BACK_MUSCLE_ORDER: MuscleId[] = [
  'trapezius', 'rear_deltoids', 'upper_back', 'lats', 'triceps', 'forearms',
  'lower_back', 'glutes', 'hamstrings', 'calves',
];

/* ── Component ───────────────────────────────────────────────────────────── */

export const BodyMap = ({
  musclesWorked = [],
  interactive = false,
  selectedMuscles: controlledSelected,
  onMuscleToggle,
  onViewChange,
}: BodyMapProps) => {
  const [view, setView] = useState<BodyView>('front');
  const [internalSelected, setInternalSelected] = useState<Set<MuscleId>>(new Set());
  const [hoveredPolygonId, setHoveredPolygonId] = useState<string | null>(null);

  // Resolve musclesWorked prop → MuscleIds
  const propActiveIds = useMemo<Set<MuscleId>>(() => {
    const ids = new Set<MuscleId>();
    musclesWorked.forEach(term => {
      (WORKOUT_MAP[term.toUpperCase()] ?? []).forEach(id => ids.add(id));
    });
    return ids;
  }, [musclesWorked]);

  // Effective selected set (controlled or internal)
  const selectedSet = useMemo<Set<MuscleId>>(() => {
    if (controlledSelected) return new Set(controlledSelected);
    return internalSelected;
  }, [controlledSelected, internalSelected]);

  // All active (display + interactive)
  const activeIds = useMemo<Set<MuscleId>>(
    () => new Set([...propActiveIds, ...selectedSet]),
    [propActiveIds, selectedSet]
  );

  const handleViewChange = useCallback((v: BodyView) => {
    setView(v);
    onViewChange?.(v);
  }, [onViewChange]);

  const toggleMuscle = useCallback((muscleId: MuscleId) => {
    if (!interactive) return;
    if (onMuscleToggle) {
      onMuscleToggle(muscleId);
    } else {
      setInternalSelected(prev => {
        const next = new Set(prev);
        next.has(muscleId) ? next.delete(muscleId) : next.add(muscleId);
        return next;
      });
    }
  }, [interactive, onMuscleToggle]);

  // Polygon data for current view
  const polygons = view === 'front' ? ANTERIOR_POLYGONS : POSTERIOR_POLYGONS;
  const polygonLookup = useMemo(() => buildPolygonLookup(view), [view]);

  // Chip list for current view
  const chipMuscles = view === 'front' ? FRONT_MUSCLE_ORDER : BACK_MUSCLE_ORDER;

  // For a given polygon, is it active?
  const isPolygonActive = useCallback((polygonId: string): boolean => {
    const muscleIds = polygonLookup.get(polygonId);
    if (!muscleIds) return false;
    return muscleIds.some(id => activeIds.has(id));
  }, [polygonLookup, activeIds]);

  // For a given polygon, get the first MuscleId it maps to
  const getMuscleId = useCallback((polygonId: string): MuscleId | null => {
    return polygonLookup.get(polygonId)?.[0] ?? null;
  }, [polygonLookup]);

  // Is polygon interactive (has a MuscleId)?
  const isInteractivePolygon = (polygonId: string) =>
    interactive && !!polygonLookup.get(polygonId)?.length;

  return (
    <div className="flex flex-col items-center gap-5 w-full select-none">

      {/* ── Segmented control ─────────────────────────────────────────── */}
      <div className="relative flex rounded-full p-[3px] bg-white/5 border border-white/8">
        <motion.div
          layout
          className="absolute inset-[3px] rounded-full bg-white/90"
          style={{
            left: view === 'front' ? '3px' : '50%',
            right: view === 'front' ? '50%' : '3px',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
        {(['front', 'back'] as BodyView[]).map(v => (
          <button
            key={v}
            aria-pressed={view === v}
            aria-label={`${v} view`}
            onClick={() => handleViewChange(v)}
            className={`relative z-10 px-7 py-1.5 text-[10px] font-extrabold tracking-[0.22em] uppercase rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              view === v ? 'text-white' : 'text-white/38 hover:text-white/60'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── SVG body map ─────────────────────────────────────────────── */}
      <div className="w-full max-w-[220px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              viewBox="0 0 100 230"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`Interactive body map — ${view} view`}
              style={{ display: 'block' }}
            >
              <defs>
                {/* Glow filter for selected muscles */}
                <filter id="bm-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Gradient for selected muscles */}
                <linearGradient id="bm-active-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F2F2F2" />
                  <stop offset="100%" stopColor="#C8C8C8" />
                </linearGradient>
                {/* Hover gradient */}
                <linearGradient id="bm-hover-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3a3a3a" />
                  <stop offset="100%" stopColor="#2a2a2a" />
                </linearGradient>
              </defs>

              {/* ── Base body silhouette (layer 1) — always visible ── */}
              <path
                d={view === 'front' ? FRONT_SILHOUETTE : BACK_SILHOUETTE}
                fill="#171717"
                stroke="#555555"
                strokeWidth="0.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* ── Muscle polygons (layer 2) — selectable ── */}
              {polygons.map((poly, idx) => {
                const active = isPolygonActive(poly.id);
                const hovered = hoveredPolygonId === `${poly.id}-${idx}`;
                const muscleId = getMuscleId(poly.id);
                const canInteract = isInteractivePolygon(poly.id);

                let fill: string;
                let stroke: string;
                let strokeWidth: number;
                let filterAttr: string | undefined;

                if (active) {
                  fill = 'url(#bm-active-grad)';
                  stroke = '#E8E8E8';
                  strokeWidth = 0.35;
                  filterAttr = 'url(#bm-glow)';
                } else if (hovered && canInteract) {
                  fill = 'url(#bm-hover-grad)';
                  stroke = '#606060';
                  strokeWidth = 0.35;
                } else {
                  // Non-interactive structural polygons (head, neck, knees)
                  const structural = ['head', 'neck', 'knees'].includes(poly.id);
                  fill = structural ? '#161616' : '#1b1b1b';
                  stroke = structural ? '#404040' : '#505050';
                  strokeWidth = 0.3;
                }

                return (
                  <polygon
                    key={`${poly.id}-${idx}`}
                    points={poly.points}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    filter={filterAttr}
                    style={{
                      cursor: canInteract ? 'pointer' : 'default',
                      transition: 'fill 180ms ease, stroke 180ms ease',
                    }}
                    onClick={() => {
                      if (canInteract && muscleId) toggleMuscle(muscleId);
                    }}
                    onMouseEnter={() => {
                      if (canInteract) setHoveredPolygonId(`${poly.id}-${idx}`);
                    }}
                    onMouseLeave={() => setHoveredPolygonId(null)}
                    aria-label={muscleId ? MUSCLE_CONFIG[muscleId].label : undefined}
                    role={canInteract ? 'button' : undefined}
                  />
                );
              })}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Muscle chips ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 justify-center px-2">
        {chipMuscles.map(muscleId => {
          const cfg = MUSCLE_CONFIG[muscleId];
          const isActive = activeIds.has(muscleId);
          return (
            <button
              key={muscleId}
              aria-pressed={isActive}
              aria-label={cfg.label}
              onClick={() => {
                if (interactive) toggleMuscle(muscleId);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                isActive
                  ? 'bg-white border-white text-black shadow-[0_0_8px_rgba(255,255,255,0.25)]'
                  : 'bg-transparent border-white/15 text-white/40'
              } ${interactive ? 'hover:border-white/30 cursor-pointer' : 'cursor-default'}`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
