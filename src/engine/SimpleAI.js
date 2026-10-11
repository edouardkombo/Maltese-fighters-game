import { Control } from '../constants/controls.js';
import { FighterState } from '../constants/fighter.js';

/**
 * Very basic CPU for player index 1 (P2).
 * Injects synthetic key presses into the existing input system
 * by calling the same heldKeys path the keyboard uses.
 */
export class SimpleAI {
  constructor(fighter, opponent) {
    this.fighter = fighter;
    this.opponent = opponent;
    this.timer = 0;
    this.nextAction = 0;
  }

  // returns a set of Control names that should be considered "held"
  getHeldControls(time) {
    const held = new Set();
    if (!this.fighter || !this.opponent) return held;
    if (this.fighter.currentState === FighterState.KO) return held;

    const dx = this.opponent.position.x - this.fighter.position.x;
    const dist = Math.abs(dx);
    const facingRight = this.fighter.direction > 0;

    // face the opponent
    if (dx > 20) held.add(Control.RIGHT);
    else if (dx < -20) held.add(Control.LEFT);

    this.timer++;
    if (this.timer < this.nextAction) return held;

    this.timer = 0;
    this.nextAction = 20 + Math.floor(Math.random() * 40);

    if (dist > 120) {
      // approach
      if (dx > 0) held.add(Control.RIGHT);
      else held.add(Control.LEFT);
    } else if (dist > 60) {
      // occasional jump or medium attack
      const r = Math.random();
      if (r < 0.25) held.add(Control.UP);
      else if (r < 0.55) held.add(Control.MEDIUM_PUNCH);
      else if (r < 0.75) held.add(Control.MEDIUM_KICK);
    } else {
      // close range – attack or block-ish (down)
      const r = Math.random();
      if (r < 0.35) held.add(Control.LIGHT_PUNCH);
      else if (r < 0.55) held.add(Control.LIGHT_KICK);
      else if (r < 0.7) held.add(Control.HEAVY_PUNCH);
      else if (r < 0.85) held.add(Control.DOWN); // crouch/block
      else held.add(Control.UP);
    }
    return held;
  }
}
