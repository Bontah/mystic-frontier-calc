/**
 * Character and roster types
 */

import type { Familiar } from './familiar.js';

/**
 * Character with their familiar roster
 */
export interface Character {
  id: number;
  name: string;
  roster: Familiar[];
}
