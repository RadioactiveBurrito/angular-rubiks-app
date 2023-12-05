import * as THREE from 'three';
import { Move, MoveType3By3 } from '../classes/move';
import { Key } from 'ts-keycode-enum';
import { IMoveCodeToRotationBindingsInitializer, ThreeByThreeMoveCodeToRotationBindingsInitializer } from './moveRotationInitializer';

export class Rubiks {

    moveToRotation!: Map<number, Move>;
    moveToRotationInitializer!: IMoveCodeToRotationBindingsInitializer;
    elementsInScene: THREE.Group = new THREE.Group();
    moves!: Move[];
    cubies = new Array<THREE.Mesh>();

    cubeSideLength: number = 0;
    cubieLength: number = 0;
    cubieSpacingFactor: number = 2.5;

    constructor(private cubieMesh: THREE.Mesh, moveToRotationInitializer: IMoveCodeToRotationBindingsInitializer = new ThreeByThreeMoveCodeToRotationBindingsInitializer(), public size: number = 3) {
        this.cubieLength = cubieMesh.scale.x/4;
        this.moveToRotationInitializer = moveToRotationInitializer;
        this.cubeSideLength = (size - 1) * this.cubieLength;
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
    
      public addToScene(scene: THREE.Scene) {
        this.initializeVisualCubeLayout();
        this.initializeMoves(this.moveToRotationInitializer);
        scene.add(this.elementsInScene);
      }

      public handleKeyDownEvent(keyDownEvent: KeyboardEvent) {
        // todo: better this part
        this.moveToRotation.forEach((move, key) => {
          if(move.moveCode == keyDownEvent.keyCode) {
            this.doMove(move);
          }
        });
      }
    
      public doMove(move: Move) {
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
        const instancesInSlice: number[] = this.findInstancesInBoundingBox(boundingBox);
    
        let group = new THREE.Group();
    
        instancesInSlice.forEach((instanceIndex) => {
          group.add(this.cubies[instanceIndex]);
        });
    
        group.rotateOnWorldAxis(axis, angle);
    
        let tempQuaternion = new THREE.Quaternion();
        let tempPosition = new THREE.Vector3();
        instancesInSlice.forEach((instanceIndex) => {
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
            console.log('caca');
    
            const slicePosition = positionSelector[i].clone().multiplyScalar(coord * this.cubieLength * this.cubieSpacingFactor);
            cubeSlice.position.copy(slicePosition);
    
            const dimensionsSlice = dimensionsSelector[i].clone().multiplyScalar(this.cubeSideLength).add(positionSelector[i].clone().multiplyScalar(this.cubieLength / this.cubieSpacingFactor));
            cubeSlice.scale.copy(dimensionsSlice);

            // Add the invisible cube slice to the array
            cubeSlices.push(cubeSlice);
            this.elementsInScene.add(cubeSlice);
          }
        }

        this.moveToRotation = moveToRotationInitializer.initializeMoveCodeToRotationBindings(cubeSlices);
      }
    
      private isValidCubie(x: number, y: number, z: number, minCoord: number, maxCoord: number): boolean {
        return (
          x === minCoord || x === maxCoord ||
          y === minCoord || y === maxCoord ||
          z === minCoord || z === maxCoord
        );
      }
}