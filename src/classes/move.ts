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

export enum MoveType2By2 {
  FRONT = 0,
  BACK = 1,
  DOWN = 2,
  UP = 3,
  LEFT = 4,
  RIGHT = 5,
};

export class Move {
  /**
   * 
   * @param axis The axis around which the move turns.
   * @param angle The angle of turning. Always a factor of 90 degrees.
   * @param moveCode Either the keycode of the keyboard, or the code of the move for larger cubes that don't have standard notation. See moveRotationInitializer.
   * @param slice The bounding box encapsulating the group of cubies being moved by this move.
   */
    constructor(public axis: THREE.Vector3, public angle: number, public moveCode: number, public slice: THREE.Mesh) {
    }
}