import { Move, MoveType2By2, MoveType3By3 } from '../classes/move';
import * as THREE from 'three';
import { Key } from 'ts-keycode-enum';

export interface IMoveCodeToRotationBindingsInitializer {
    initializeMoveCodeToRotationBindings(cubeSlices: THREE.Mesh[]): Map<number, Move>;
}

export class ThreeByThreeMoveCodeToRotationBindingsInitializer implements IMoveCodeToRotationBindingsInitializer {
    initializeMoveCodeToRotationBindings(cubeSlices: THREE.Mesh[]): Map<number, Move> {
        let numberToRotationBinding = new Map<number, Move>();

        numberToRotationBinding.set(MoveType3By3.LEFT, new Move(new THREE.Vector3(0, 0, 1), Math.PI / 2, Key.L, cubeSlices[MoveType3By3.LEFT]));
        numberToRotationBinding.set(MoveType3By3.MIDDLE, new Move(new THREE.Vector3(0, 0, 1), Math.PI / 2, Key.M, cubeSlices[MoveType3By3.MIDDLE]));
        numberToRotationBinding.set(MoveType3By3.RIGHT, new Move(new THREE.Vector3(0, 0, 1), -Math.PI / 2, Key.R, cubeSlices[MoveType3By3.RIGHT]));

        numberToRotationBinding.set(MoveType3By3.FRONT, new Move(new THREE.Vector3(1, 0, 0), Math.PI / 2, Key.F, cubeSlices[MoveType3By3.FRONT]));
        numberToRotationBinding.set(MoveType3By3.SIDE, new Move(new THREE.Vector3(1, 0, 0), Math.PI / 2, Key.S, cubeSlices[MoveType3By3.SIDE]));
        numberToRotationBinding.set(MoveType3By3.BACK, new Move(new THREE.Vector3(1, 0, 0), -Math.PI / 2, Key.B, cubeSlices[MoveType3By3.BACK]));

        numberToRotationBinding.set(MoveType3By3.DOWN, new Move(new THREE.Vector3(0, 1, 0), Math.PI / 2, Key.D, cubeSlices[MoveType3By3.DOWN]));
        numberToRotationBinding.set(MoveType3By3.E, new Move(new THREE.Vector3(0, 1, 0), Math.PI / 2, Key.E, cubeSlices[MoveType3By3.E]));
        numberToRotationBinding.set(MoveType3By3.UP, new Move(new THREE.Vector3(0, 1, 0), -Math.PI / 2, Key.U, cubeSlices[MoveType3By3.UP]));
        
        return numberToRotationBinding;
    }
}

export class TwoByTwoMoveCodeToRotationBindingsInitializer implements IMoveCodeToRotationBindingsInitializer {
    initializeMoveCodeToRotationBindings(cubeSlices: THREE.Mesh[]): Map<number, Move> {
        let moveCodeToRotationBinding = new Map<number, Move>();

        moveCodeToRotationBinding.set(MoveType2By2.FRONT, new Move(new THREE.Vector3(1, 0, 0), Math.PI / 2, Key.A, cubeSlices[MoveType2By2.FRONT]));
        moveCodeToRotationBinding.set(MoveType2By2.BACK, new Move(new THREE.Vector3(1, 0, 0), -Math.PI / 2, Key.B, cubeSlices[MoveType2By2.BACK]));

        moveCodeToRotationBinding.set(MoveType2By2.DOWN, new Move(new THREE.Vector3(0, 1, 0), Math.PI / 2, Key.D, cubeSlices[MoveType2By2.DOWN]));
        moveCodeToRotationBinding.set(MoveType2By2.UP, new Move(new THREE.Vector3(0, 1, 0), -Math.PI / 2, Key.U, cubeSlices[MoveType2By2.UP]));

        moveCodeToRotationBinding.set(MoveType2By2.LEFT, new Move(new THREE.Vector3(0, 0, 1), Math.PI / 2, Key.L, cubeSlices[MoveType2By2.LEFT]));
        moveCodeToRotationBinding.set(MoveType2By2.RIGHT, new Move(new THREE.Vector3(0, 0, 1), -Math.PI / 2, Key.R, cubeSlices[MoveType2By2.RIGHT]));
        
        return moveCodeToRotationBinding;
    }
}

export class GenericMoveCodeToRotationBindingsInitializer implements IMoveCodeToRotationBindingsInitializer {
    initializeMoveCodeToRotationBindings(cubeSlices: THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[], THREE.Object3DEventMap>[]): Map<number, Move> {
        let moveCodeToRotationBinding = new Map<number, Move>();
        cubeSlices.forEach((slice, index) => {
            let axis: THREE.Vector3;

            if(index >= 2*cubeSlices.length/3.0) {
                axis = new THREE.Vector3(0, 0, 1);
            }
            else if(index >= cubeSlices.length/3.0) {
                axis = new THREE.Vector3(0, 1, 0);
            }
            else {
                axis = new THREE.Vector3(1, 0, 0);
            }

            moveCodeToRotationBinding.set(index + Key.A, new Move(axis, Math.PI/2, index + Key.A, slice));
        });
        return moveCodeToRotationBinding;
    }
}