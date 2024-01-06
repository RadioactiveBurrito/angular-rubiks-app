import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js'
import { Move } from '../classes/move';
import { IMoveCodeToRotationBindingsInitializer, ThreeByThreeMoveCodeToRotationBindingsInitializer } from './moveRotationInitializer';
import { ISolvable, CubieState } from './solver';
import { vector3ToString } from './threeUtils';
import { Key } from 'ts-keycode-enum';

import { Queue } from 'queue-typescript';

export interface IMovable {
  doMove(move: Move, animated: boolean, animationDelayMs: number): void;
  doMoves(moves: Move[], animated: boolean, animationDelayMs: number): void;
};

export interface IAnimate {
  doAnimationFrame(): void;
};

export class Rubiks implements ISolvable, IMovable {
    private scene!: THREE.Scene;
    private moveCodeToMove!: Map<number, Move>;
    private movesQueued: Queue<Move> = new Queue<Move>();
    private moveToRotationInitializer!: IMoveCodeToRotationBindingsInitializer;
    private elementsInScene: THREE.Group = new THREE.Group();
    private cubies = new Array<THREE.Mesh>();
    private cracks = new Array<THREE.Mesh>(); // cosmetic boxes in cracks of the cube. Will turn as of the current design (don't turn them later on...)

    private cubeSideLength: number = 0;
    private cubieLength: number = 0;
    private cubieSpacingFactor: number = 2.5;

    private isTurning: boolean = false;
    private cubieIndicesInRotatingSlice = new Array<number>();

    constructor(private cubieMesh: THREE.Mesh, moveToRotationInitializer: IMoveCodeToRotationBindingsInitializer = new ThreeByThreeMoveCodeToRotationBindingsInitializer(), public size: number = 3) {
        this.cubieLength = cubieMesh.scale.x/4; // magic number based on the cubie mesh model
        this.moveToRotationInitializer = moveToRotationInitializer;
        this.cubeSideLength = size * this.cubieLength * this.cubieSpacingFactor;
    }

    getMove(moveCode: number): Move {
      return this.moveCodeToMove.get(moveCode)!;
    }

    getMoveDisplacementMappings(): Map<number, Map<string, string>> {
      if(this.isTurning) {
        throw new Error("Trying to build a displacement mapping while the cube is turning.");
      }

      // TODO: ASK FOR WRITE PERMISSIONS?
      // TODO: Check if a file containing the map is already on disk

      const moveDisplacementMappings = new Map<number, Map<string, string>>();
      
      this.moveCodeToMove.forEach((move: Move) => {

        var beforeMoveStates = this.getCurrentState().sort(
          (a,b) => a.initialState.localeCompare(b.initialState)); // sort to align the cubies in the next for loop

        this.doMove(move);

        var afterMoveStates = this.getCurrentState().sort(
          (a,b) => a.initialState.localeCompare(b.initialState)); // sort to align the cubies in the next for loop

        this.doMoveInverse(move); // put back in initial state

        var cubieStateToCubieState = new Map<string, string>();
        for(let i = 0; i < afterMoveStates.length; ++i) {
          cubieStateToCubieState.set(beforeMoveStates[i].currentState, afterMoveStates[i].currentState);
        }

        moveDisplacementMappings.set(move.moveCode, cubieStateToCubieState);
      });

      // TODO: DUMP MAPPINGS TO DISK

      return moveDisplacementMappings;
    }

    public getNbPossibleMoves(): number {
      return this.moveCodeToMove.size;
    }

    public getCurrentState(): CubieState[] {
      let currentState = new Array<CubieState>();

      this.cubies.forEach((cubie) => {
        currentState.push(new CubieState(vector3ToString(cubie.position), cubie.name));
      });

      return currentState;
    }

    public addToScene(scene: THREE.Scene) {
      this.initializeVisualCubeLayout();
      this.initializeMoves(this.moveToRotationInitializer);
      scene.add(this.elementsInScene);
      this.scene = scene;
    }

    public handleKeyDownEvent(keyDownEvent: KeyboardEvent) {
      // todo: better this method
      this.moveCodeToMove.forEach((move, key) => {
        if(move.moveCode == keyDownEvent.keyCode) {
          this.doMove(move, true, 250); // TODO: DISCARD MOVE AND DONT QUEUE PARAM, SO THAT IT'S NOT CONFUSING WHEN SPAMMING
        }
      });
    }
  
  public doMoveInverse(move: Move) {
    if(this.isTurning) {
      return;
    }

    if((move.moveCode - Key.A) % 3 == 0) {
      this.doMove(this.moveCodeToMove.get(move.moveCode + 1)!);
    }
    else if((move.moveCode - Key.A) % 3 == 1) {
      this.doMove(this.moveCodeToMove.get(move.moveCode - 1)!);
    } 
    else {
      this.doMove(move);
    }
  }

  public doMoves(moves: Move[], animated: boolean = false, animationDelayMs: number = 1) {
    if(this.isTurning) {
      return;
    }

    if(animated) {
      this.isTurning = true;
      moves.forEach((move) => {
        this.movesQueued.enqueue(move);
      });
      this.doQueuedMovesAnimated(this.movesQueued.dequeue(), animationDelayMs);
    }
    else {
      moves.forEach((move) => {
        this.doMove(move, animated)
      })
    }
  }

  public doMove(move: Move, animated: boolean = false, animationDelayMs: number = 1) {
      if(this.isTurning) {
        return;
      }

      this.isTurning = true;

      const axis = move.axis;
      const angle = move.angle;

      this.cubieIndicesInRotatingSlice = this.findInstancesInBoundingBox(this.getSliceBoundingBox(move.slice)); // todo: prevent creation of array
  
      if(!animated) {
        this.doMoveAxisAngle(axis, angle);
        this.isTurning = false;
      } 
      else {
        this.doQueuedMovesAnimated(move, animationDelayMs);
      }
    }

    private getSliceBoundingBox(slice: THREE.Mesh): THREE.Box3 {
      // Get the position and scaled box extent of the slice
      const boxLocation = new THREE.Vector3();
      const boxExtents = new THREE.Vector3();
      slice.getWorldPosition(boxLocation);
      slice.getWorldScale(boxExtents);

      // Calculate the minimum and maximum corners of the bounding box
      const minCorner = new THREE.Vector3().subVectors(boxLocation, boxExtents);
      const maxCorner = new THREE.Vector3().addVectors(boxLocation, boxExtents);

      // Create a Box3 from the calculated corners
      return new THREE.Box3(minCorner, maxCorner);
    }

    private doQueuedMovesAnimated(move: Move, animationDelayMs: number) {
      const axis = move.axis;
      const angle = move.angle;

      // Get the indices of instances overlapping with the bounding box
      this.cubieIndicesInRotatingSlice = this.findInstancesInBoundingBox(this.getSliceBoundingBox(move.slice)); // todo: prevent creation of array

      let group = new THREE.Group();

      this.cubieIndicesInRotatingSlice.forEach((instanceIndex) => {
        group.add(this.cubies[instanceIndex]);
      });

      this.scene.add(group);

      // animate turning

      var time = {t:0};
      let targetQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      targetQuaternion.normalize();

      new TWEEN.Tween(time)
      .to({t:1}, animationDelayMs)
      .onUpdate(() => {
        group.quaternion.slerp(targetQuaternion, time.t);
      })
      .onComplete(() => {
        group.quaternion.copy(targetQuaternion);

        let tempQuaternion = new THREE.Quaternion();
        let tempPosition = new THREE.Vector3();
        this.cubieIndicesInRotatingSlice.forEach((instanceIndex) => {
          // Read world rotations before removal
          this.cubies[instanceIndex].getWorldQuaternion(tempQuaternion);
          this.cubies[instanceIndex].getWorldPosition(tempPosition);
    
          // Round quaternion components to 2 decimal places
          tempQuaternion.x = Number(tempQuaternion.x.toFixed(2));
          tempQuaternion.y = Number(tempQuaternion.y.toFixed(2));
          tempQuaternion.z = Number(tempQuaternion.z.toFixed(2));
          tempQuaternion.w = Number(tempQuaternion.w.toFixed(2));

          // Round vector components to 2 decimal places
          tempPosition.x = Number(tempPosition.x.toFixed(2));
          tempPosition.y = Number(tempPosition.y.toFixed(2));
          tempPosition.z = Number(tempPosition.z.toFixed(2));

          // Take the cube out of the rotation group, place into the rubiks object group.
          this.elementsInScene.add(this.cubies[instanceIndex]);
    
          // Now we re-apply the world rotations to the cube
          this.cubies[instanceIndex].quaternion.copy(tempQuaternion);
          this.cubies[instanceIndex].position.copy(tempPosition);
        });

        if(this.movesQueued.length != 0) {
          this.doQueuedMovesAnimated(this.movesQueued.dequeue(), animationDelayMs); // TODO: THIS IS DONE WITH THE PARAMETERS OF THE FIRST MOVE TREATED. IF CHANGES MID WAY, WILL BUG
        }
        else {
          this.isTurning = false;
        }
      })
      .start();
    }

    private resetToInitalState() {
      // TODO EVENTUALLY...
    }

    private doMoveAxisAngle(axis: THREE.Vector3, angle: number) {
      let group = new THREE.Group();
  
      this.cubieIndicesInRotatingSlice.forEach((instanceIndex) => {
        group.add(this.cubies[instanceIndex]);
      });

      var rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      rotationQuaternion.normalize();

      group.setRotationFromQuaternion(rotationQuaternion);        
    
      let tempQuaternion = new THREE.Quaternion();
      let tempPosition = new THREE.Vector3();
      this.cubieIndicesInRotatingSlice.forEach((instanceIndex) => {
        // Read world rotations before removal
        this.cubies[instanceIndex].getWorldQuaternion(tempQuaternion);
        this.cubies[instanceIndex].getWorldPosition(tempPosition);
  
        // Round quaternion components to 2 decimal places
        tempQuaternion.x = Number(tempQuaternion.x.toFixed(2));
        tempQuaternion.y = Number(tempQuaternion.y.toFixed(2));
        tempQuaternion.z = Number(tempQuaternion.z.toFixed(2));
        tempQuaternion.w = Number(tempQuaternion.w.toFixed(2));

        // Round vector components to 2 decimal places
        tempPosition.x = Number(tempPosition.x.toFixed(2));
        tempPosition.y = Number(tempPosition.y.toFixed(2));
        tempPosition.z = Number(tempPosition.z.toFixed(2));

        // Take the cube out of the rotation group, place into the rubiks object group.
        this.elementsInScene.add(this.cubies[instanceIndex]);
  
        // Now we re-apply the world rotations to the cube
        this.cubies[instanceIndex].quaternion.copy(tempQuaternion);
        this.cubies[instanceIndex].position.copy(tempPosition);
      });
    }

    private initializeVisualCubeLayout() {
        const maxCoord = (this.size - 1) / 2;
        const minCoord = -maxCoord;

        for (let x = minCoord; x <= maxCoord; ++x) {
          for (let y = minCoord; y <= maxCoord; ++y) {
            for (let z = minCoord; z <= maxCoord; ++z) {
              if (this.isValidCubie(x, y, z, minCoord, maxCoord)) {
                const cubie = this.cubieMesh.clone();
                const cubiePosition = new THREE.Vector3(
                  x * (this.cubieLength * this.cubieSpacingFactor),
                  y * (this.cubieLength * this.cubieSpacingFactor),
                  z * (this.cubieLength * this.cubieSpacingFactor)
                );
                
                cubie.position.copy(cubiePosition);
                cubie.scale.set(this.cubieLength, this.cubieLength, this.cubieLength);
                cubie.matrixAutoUpdate = true;

                // use the cubie name as the identifier
                cubie.position.x = Number(cubie.position.x.toFixed(2));
                cubie.position.y = Number(cubie.position.y.toFixed(2));
                cubie.position.z = Number(cubie.position.z.toFixed(2));
                cubie.name = cubiePosition.toArray().toString();

                this.cubies.push(cubie);
                this.elementsInScene.add(cubie);
              }
            }
          }
        }
      }
    
      private findInstancesInBoundingBox(boundingBox: THREE.Box3): number[] {
        const instancesInSlice: number[] = [];
    
        // Iterate over all instances and check if they overlap with the bounding box
        for (let instanceIndex = 0; instanceIndex < this.cubies.length; instanceIndex++) {
          // Check if the instance position is within the bounding box
          if (boundingBox.intersectsBox(new THREE.Box3().setFromObject(this.cubies[instanceIndex]))) { // todo keep colliding boxes
            instancesInSlice.push(instanceIndex);
          }
        }
    
        return instancesInSlice;
      }
    
      private initializeMoves(moveToRotationInitializer: IMoveCodeToRotationBindingsInitializer) {
        let cubeSlices: THREE.Mesh[] = [];
        const nbDimensions = 3;
        const dimensionIdentifier = ['X', 'Y', 'Z'];
        const positionSelector = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
        const dimensionsSelector = [new THREE.Vector3(0, 1, 1), new THREE.Vector3(1, 0, 1), new THREE.Vector3(1, 1, 0)];
      
        const maxCoord = (this.size - 1) / 2;
        const minCoord = -maxCoord;
      
        let sliceIdentifier: string;

        for (let i = 0; i < nbDimensions; ++i) {
          for (let coord = minCoord; coord <= maxCoord; ++coord) {
            // TODO: STOCK THIS
            sliceIdentifier = dimensionIdentifier[i] + coord;
    
            const cubeSlice = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1).center(),
              new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false}) // red color to debug when visible is true, reuse this mesh later on to reduce overhead
            );
    
            const slicePosition = positionSelector[i].clone().multiplyScalar(coord * this.cubieLength * this.cubieSpacingFactor);
            cubeSlice.position.copy(slicePosition);
    
            const dimensionsSlice = dimensionsSelector[i].clone().multiplyScalar(this.cubeSideLength).add(positionSelector[i].clone().multiplyScalar(this.cubieLength / this.cubieSpacingFactor));
            cubeSlice.scale.copy(dimensionsSlice);

            // Add the invisible cube slice to the array
            cubeSlices.push(cubeSlice);

            this.elementsInScene.add(cubeSlice);
          }
        }

        this.moveCodeToMove = moveToRotationInitializer.initializeMoveCodeToRotationBindings(cubeSlices);
      }
    
      private isValidCubie(x: number, y: number, z: number, minCoord: number, maxCoord: number): boolean {
        return (
          x === minCoord || x === maxCoord ||
          y === minCoord || y === maxCoord ||
          z === minCoord || z === maxCoord
        );
      }
}