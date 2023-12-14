import * as THREE from 'three';
import { Move } from '../classes/move';
import { IMoveCodeToRotationBindingsInitializer, ThreeByThreeMoveCodeToRotationBindingsInitializer } from './moveRotationInitializer';
import { ISolvable, CubieState } from './solver';
import { ThreedSceneComponent } from '../app/threed-scene/threed-scene.component';
import { vector3ToString, stringToVector3 } from './threeUtils';
import { Key } from 'ts-keycode-enum';

export interface IMovable {
  doMove(move: Move, animated: boolean, animationDelayMs: number): void;
};

export interface IAnimate {
  doAnimationFrame(): void;
};

export class Rubiks implements ISolvable, IMovable, IAnimate {
    private moveCodeToMove!: Map<number, Move>;
    private moveToRotationInitializer!: IMoveCodeToRotationBindingsInitializer;
    private elementsInScene: THREE.Group = new THREE.Group();
    private cubies = new Array<THREE.Mesh>();
    private cracks = new Array<THREE.Mesh>(); // cosmetic boxes in cracks of the cube. Will turn as of the current design (don't turn them later on...)

    private cubeSideLength: number = 0;
    private cubieLength: number = 0;
    private cubieSpacingFactor: number = 2.5;

    private isTurning: boolean = false;
    private currentAngle: number = 0;
    private axisTurn: THREE.Vector3 = new THREE.Vector3();
    private targetAngle: number = 0;
    private cubieIndicesInAnimation = new Array<number>();
    private counter: number = 0;

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
          (a,b) => a.initialState.localeCompare(b.initialState));
        this.doMove(move);
        var afterMoveStates = this.getCurrentState().sort(
          (a,b) => a.initialState.localeCompare(b.initialState)); // not sure about this trick to get the array sorted;
        this.doMoveInverse(move); // put back in initial state

        var cubieStateToCubieState = new Map<string, string>();
        for(let i = 0; i < afterMoveStates.length; ++i) {
          if(afterMoveStates[i].initialState !== beforeMoveStates[i].initialState) {
            throw new Error(afterMoveStates[i].initialState + beforeMoveStates[i].initialState);
          }
          cubieStateToCubieState.set(beforeMoveStates[i].currentState, afterMoveStates[i].currentState);
        }

        moveDisplacementMappings.set(move.moveCode, cubieStateToCubieState);
      });

      // TODO: DUMP MAPPINGS TO DISK

      return moveDisplacementMappings;
    }

    public doAnimationFrame(): void {
      if(this.isTurning) {
        // todo
        if(this.counter-- <= 0) {// magic number TO REMOVE - FIGURE OUT WHY ROTATION EXCEEDS WHEN DOING THIS
          this.isTurning = false;// TODO: NOT WORKING
          return;
          // todo: snap to exactly target angle
        }

        this.currentAngle += (this.targetAngle)/this.counter;
        this.targetAngle -=  (this.targetAngle)/this.counter;
        this.doMoveAxisAngle(this.axisTurn, this.currentAngle);
      }
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
    }

    public handleKeyDownEvent(keyDownEvent: KeyboardEvent) {
      // todo: better this method
      this.moveCodeToMove.forEach((move, key) => {
        if(move.moveCode == keyDownEvent.keyCode) {
          if(!this.isTurning) {
            this.isTurning = true;
            this.doMove(move, false, 1);// todo: animation delay
          }
        }
      });
    }
  
  public doMoveInverse(move: Move) {
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

  public doMove(move: Move, animated: boolean = false, animationDelayMs: number = 1) {
      const slice = move.slice; // copy slice in the move instead of the type?
      const axis = move.axis;
      const angle = move.angle;
  
      // Get the position and scaled box extent of the slice
      const boxLocation = new THREE.Vector3();
      const boxExtents = new THREE.Vector3();
      slice.getWorldPosition(boxLocation);
      slice.getWorldScale(boxExtents);
  
      // Calculate the minimum and maximum corners of the bounding box
      const minCorner = new THREE.Vector3().subVectors(boxLocation, boxExtents);
      const maxCorner = new THREE.Vector3().addVectors(boxLocation, boxExtents);
  
      // Create a Box3 from the calculated corners
      const boundingBox = new THREE.Box3(minCorner, maxCorner);
  
      // Get the indices of instances overlapping with the bounding box
      this.cubieIndicesInAnimation = this.findInstancesInBoundingBox(boundingBox); // todo: prevent creation of array
  
      if(!animated) {
        this.doMoveAxisAngle(axis, angle);
      } 
      else {
        this.targetAngle = angle;
        this.counter = 100;
        this.currentAngle = 0;
        this.axisTurn = axis;
        this.isTurning = true;
      }
    }

    private resetToInitalState() {
      // TODO EVENTUALLY...
    }

    private doMoveAxisAngle(axis: THREE.Vector3, angle: number) {
      let group = new THREE.Group();
  
      this.cubieIndicesInAnimation.forEach((instanceIndex) => {
        group.add(this.cubies[instanceIndex]);
      });

      var rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);

      group.setRotationFromQuaternion(rotationQuaternion);        
    
      let tempQuaternion = new THREE.Quaternion();
      let tempPosition = new THREE.Vector3();
      this.cubieIndicesInAnimation.forEach((instanceIndex) => {
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

        // for(let i = 0; i < nbDimensions; ++i) {
        //   for(let )
        // }


        // const crackMesh = new THREE.Mesh(
        //   new THREE.BoxGeometry(1, 1, 1),
        //   new THREE.MeshBasicMaterial({color: 0x0})
        // );

        // const crackPosition = positionSelector[i].clone().multiplyScalar(coord * this.cubeSideLength * this.cubieSpacingFactor/this.size);
        // crackMesh.position.copy(crackPosition);

        // const dimensionsCrack = dimensionsSelector[i].clone().multiplyScalar(this.cubeSideLength).add(positionSelector[i].clone().multiplyScalar(1));
        // crackMesh.scale.copy(dimensionsCrack);

        // this.cracks.push(crackMesh);
        // this.elementsInScene.add(crackMesh); //todo
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