import { Move } from "./move";
import { vector3Equals } from '../classes/threeUtils'
import { IMovable } from "./rubiks";

import { Queue } from 'queue-typescript';

export interface IRubiksSolver {
    solve(rubiksCube: ISolvable): Move[];
}

export interface ISolutionExecuter {
    execute(moves: Move[], rubiksCube: IMovable): void;
}

export interface ISolvable {
    getInitialState(): CubieState[]; 
    getCurrentState(): CubieState[];
    getNbPossibleMoves(): number;
};

export class CubieState {
    constructor(public currentState: THREE.Vector3, public initialState: THREE.Vector3) {

    }

    public isInCorrectState(): boolean {
        return vector3Equals(this.currentState, this.initialState);
    }
}

export class StandardSolutionExecuter implements ISolutionExecuter {
    public execute(moves: Move[], rubiksCube: IMovable): void {
        moves.forEach((move: Move) => {
            rubiksCube.doMove(move, false, 1000);
        });
    }
}

export class NaiveTwoByTwoRubiksSolver implements IRubiksSolver {
    public buildMoveStateMapping(): any {
        // 
    }

    // implement breadth first search
    public solve(rubiksCube: ISolvable): Move[] {

        // each array contains the move codes in sequential order
        // queue to store states on the heap (otherwise, stackoverflowexception will ensue)
        const currentState: CubieState[] = rubiksCube.getCurrentState();
        const queue = new Queue<number[]>(new Array<number>());
        let current = new Array<number>();
        do 
        {
            current = queue.dequeue();

            // see if current is in the solved state

            // if not, just carry on, nothing to see :-)
            for (let i = 0; i < rubiksCube.getNbPossibleMoves(); ++i) {
                // to move between cube states, make a lookup table that is saved to disk.
                queue.enqueue(current.concat([ i ]));
            }

            
        } while(queue.length != 0)

        throw new Error("Impossible!");
    }
}