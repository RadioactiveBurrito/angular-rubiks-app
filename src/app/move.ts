import { Key } from 'ts-keycode-enum';

export enum MoveType3By3 {
    FRONT = 0,
    SIDE = 1, // cuberotation
    BACK = 2,

    DOWN = 3,
    E = 4, // cuberotation
    UP = 5,

    LEFT = 6,
    MIDDLE = 7, // cuberotation
    RIGHT = 8,
  };

export class Move {
    constructor(public axis: THREE.Vector3, public angle: number, public keyCode: Key, public type: MoveType3By3) {
        
    }
}