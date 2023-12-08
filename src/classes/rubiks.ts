import * as THREE from 'three';
import { Move } from '../classes/move';
import { IMoveCodeToRotationBindingsInitializer, ThreeByThreeMoveCodeToRotationBindingsInitializer } from './moveRotationInitializer';
import { ISolvable, CubieState } from './solver';
import { ThreedSceneComponent } from '../app/threed-scene/threed-scene.component';

export interface IMovable {
  doMove(move: Move, animated: boolean, animationDelayMs: number): void;
};

export interface IAnimate {
  doAnimationFrame(): void;
};

export class Rubiks implements ISolvable, IMovable, IAnimate {
    private moveCodeToRotation!: Map<number, Move>;
    private moveToRotationInitializer!: IMoveCodeToRotationBindingsInitializer;
    private elementsInScene: THREE.Group = new THREE.Group();
    private cubies = new Array<THREE.Mesh>();
    private initialState = new Array<CubieState>();

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
        this.cubeSideLength = (size - 1) * this.cubieLength * this.cubieSpacingFactor;
    }

    public doAnimationFrame(): void {
      if(this.isTurning) {
        // todo
        if(this.counter++ == 4) {// magic number TO REMOVE - FIGURE OUT WHY ROTATION EXCEEDS WHEN DOING THIS
          this.isTurning = false;
          return;
          // todo: snap to exactly target angle
        }

        this.currentAngle += this.targetAngle/10;
        this.doRotationOnAnimatedCubies(this.axisTurn, this.currentAngle);
      }
    }

    public getNbPossibleMoves(): number {
      return this.moveCodeToRotation.size;
    }

    public getInitialState(): CubieState[] {
      return this.initialState;
    }

    public getCurrentState(): CubieState[] {
      let currentState = new Array<CubieState>();
      
      this.cubies.forEach((cubie) => {
        const initialState = new THREE.Vector3().fromArray(cubie.name.split(',').map(Number));
        currentState.push(new CubieState(cubie.position, initialState));
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
      this.moveCodeToRotation.forEach((move, key) => {
        if(move.moveCode == keyDownEvent.keyCode) {
          if(!this.isTurning) {
            this.isTurning = true;
            this.doMove(move, true, 1);// todo: animation delay
          }
        }
      });
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
        this.doRotationOnAnimatedCubies(axis, angle);
      } 
      else {
        this.targetAngle = angle;
        this.counter = 0;
        this.currentAngle = 0;
        this.axisTurn = axis;
        this.isTurning = true;
      }
    }

    private doRotationOnAnimatedCubies(axis: THREE.Vector3, angle: number) {
      let group = new THREE.Group();
  
      this.cubieIndicesInAnimation.forEach((instanceIndex) => {
        group.add(this.cubies[instanceIndex]);
      });

      group.rotateOnWorldAxis(axis, angle);
    
      let tempQuaternion = new THREE.Quaternion();
      let tempPosition = new THREE.Vector3();
      this.cubieIndicesInAnimation.forEach((instanceIndex) => {
        // Read world rotations before removal
        this.cubies[instanceIndex].getWorldQuaternion(tempQuaternion);
        this.cubies[instanceIndex].getWorldPosition(tempPosition);
  
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
                cubie.name = cubiePosition.toArray().toString();
                this.initialState.push(new CubieState(cubiePosition, cubiePosition));

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
          const instanceMatrix = this.cubies[instanceIndex].matrix;
    
          // Get the position of the instance
          const instancePosition = new THREE.Vector3();
          instanceMatrix.decompose(instancePosition, new THREE.Quaternion(), new THREE.Vector3());
    
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
              new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false}) // red color to debug when visible is true,
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

        this.moveCodeToRotation = moveToRotationInitializer.initializeMoveCodeToRotationBindings(cubeSlices);
      }
    
      private isValidCubie(x: number, y: number, z: number, minCoord: number, maxCoord: number): boolean {
        return (
          x === minCoord || x === maxCoord ||
          y === minCoord || y === maxCoord ||
          z === minCoord || z === maxCoord
        );
      }
}