import { Move } from "./move";
import { vector3Equals, stringToVector3 } from '../classes/threeUtils'
import { IMovable } from "./rubiks";

import { Queue } from 'queue-typescript';
import { Key } from "ts-keycode-enum";

export interface IRubiksSolver {
    solve(rubiksCube: ISolvable): number[];
}

export interface ISolutionExecuter {
    execute(moves: Move[], rubiksCube: IMovable): void;
}

export interface ISolvable {
    getCurrentState(): CubieState[];
    getNbPossibleMoves(): number;
    // For a moveCode, cubie state A goes to cubie state B
    getMoveDisplacementMappings(): Map<number, Map<string, string>>;
    getMove(moveCode: number): Move;
};

export class CubieState {
    constructor(public currentState: string, public initialState: string) {

    }

    public isSolved(): boolean {
        return vector3Equals(stringToVector3(this.currentState)!, stringToVector3(this.initialState)!);
    }
}

export class StandardSolutionExecuter implements ISolutionExecuter {
    public execute(moves: Move[], rubiksCube: IMovable): void {
        rubiksCube.doMoves(moves, true, 250);
    }
}

class NaiveRubiksCubeSearchState {
    constructor(public cubieStates: CubieState[], public movesDone: number[]) {

    }
}

export class NaiveTwoByTwoRubiksSolver implements IRubiksSolver {
    // implement breadth first search
    // TODO: CUBIE ORIENTATION, AND DETECT SOLVE IF ROTATION IS OF THE WHOLE CUBE
    public solve(rubiksCube: ISolvable): number[] {

        const moveDisplacementMappings = rubiksCube.getMoveDisplacementMappings();
        // each array contains the move codes in sequential order
        // queue to store states on the heap (otherwise, stackoverflowexception will ensue)
        const currentState: CubieState[] = rubiksCube.getCurrentState();
        const queue = new Queue<NaiveRubiksCubeSearchState>(new NaiveRubiksCubeSearchState(currentState, new Array<number>()));
        let current: NaiveRubiksCubeSearchState;
        do 
        {
            current = queue.dequeue();

            // if not, just carry on, nothing to see :-)
            for (let currentMove = Key.A; currentMove < rubiksCube.getNbPossibleMoves() + Key.A; ++currentMove) {
                if(this.skipBecauseInverseMoveCameBefore(current.movesDone, currentMove)) {
                    continue;
                }

                var state = this.buildNextCubieStatesBasedOnMoveApplied(current.cubieStates, currentMove, moveDisplacementMappings.get(currentMove)!, current.movesDone);
                if(this.isSolved(state)) {
                    return state.movesDone;
                }

                queue.enqueue(state);
            }

            
        } while(queue.length != 0)

        throw new Error("Impossible!");
    }

    private skipBecauseInverseMoveCameBefore(movesDone: Array<number>, currentMoveCode: number): boolean {
        if(movesDone.length == 0) {
            return false;
        }

        if(this.isStandardMove(currentMoveCode - Key.A)) {
            return movesDone[movesDone.length - 1] == currentMoveCode + 1; // currentMove + 1 is inverse move
        }
        else if(this.isInverseMove(currentMoveCode - Key.A)) {
            return movesDone[movesDone.length - 1] == currentMoveCode - 1; // currentMove - 1 is standard move
        } 
        else { //double move
            return movesDone[movesDone.length - 1] == currentMoveCode;
        }
    }

    private isStandardMove(moveIndex: number): boolean {
        return moveIndex % 3 == 0;
    }

    private isInverseMove(moveIndex: number): boolean {
        return moveIndex % 3 == 1;
    }

    private buildNextCubieStatesBasedOnMoveApplied(currentCubieStates: CubieState[], moveCode: number,
         moveDisplacementMapping: Map<string, string>, movesDone: number[]): NaiveRubiksCubeSearchState {
            
            const newStateCubies = new Array<CubieState>();
            currentCubieStates.forEach((cubieState) => {
                newStateCubies.push(new CubieState(moveDisplacementMapping.get(cubieState.currentState)!, cubieState.initialState));
            });

            return new NaiveRubiksCubeSearchState(newStateCubies, movesDone.concat(moveCode));
    }

    private isSolved(currentState: NaiveRubiksCubeSearchState): boolean {
        let solved = true;
        currentState.cubieStates.forEach((cubieState) => {
            if(!cubieState.isSolved()) {
                solved = false;
                return; // interrupt foreach typescript
            }
        });
        return solved;
    }
}