/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import map from "lodash-es/map.js"
import { ATNState, DecisionState } from "./atn.js"

export interface DFA {
  start?: DFAState
  states: Record<string, DFAState>
  decision: number
  atnStartState: DecisionState
}

export interface DFAState {
  configs: ATNConfigSet
  edges: Record<number, DFAState>
  isAcceptState: boolean
  prediction: number
}

export const DFA_ERROR = {} as DFAState

export interface ATNConfig {
  state: ATNState
  alt: number
  stack: ATNState[]
}

export class ATNConfigSet {
  private map: Record<string, number> = {}
  private configs: ATNConfig[] = []

  uniqueAlt: number | undefined

  get size(): number {
    return this.configs.length
  }

  finalize(): void {
    // Empties the map to free up memory
    this.map = {}
  }

  add(config: ATNConfig): void {
    const key = getATNConfigKey(config)
    // Only add configs which don't exist in our map already
    // While this does not influence the actual algorithm, adding them anyway would massively increase memory consumption
    if (!(key in this.map)) {
      this.map[key] = this.configs.length
      this.configs.push(config)
    }
  }

  get elements(): readonly ATNConfig[] {
    return this.configs
  }

  get alts(): number[] {
    return map(this.configs, (e) => e.alt)
  }

  get key(): string {
    let value = ""
    for (const k in this.map) {
      value += k + ":"
    }
    return value
  }
}

export function getATNConfigKey(config: ATNConfig, alt = true) {
  return `${alt ? `a${config.alt}` : ""}s${
    config.state.stateNumber
  }:${config.stack.map((e) => e.stateNumber.toString()).join("_")}`
}
