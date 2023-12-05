import * as THREE from 'three';
import { Move, MoveType3By3 } from '../classes/move';
import { Key } from 'ts-keycode-enum';

export class Rubiks {
    moves: { [id: number] : Move; } = {};

    elementsInScene: THREE.Group = new THREE.Group();
    cubeSlices!: THREE.Mesh[];
    cubies = new Array<THREE.Mesh>();

    spaceLengthCubies: number = 100;
    cubeSideLength: number = 0;
    cubieLength: number = 0;

    constructor(private cubieMesh: THREE.Mesh, public size: number = 3) {
        this.cubieLength = cubieMesh.scale.x;
        this.spaceLengthCubies = 1;
        this.cubeSideLength = (size - 1) * this.cubieLength + (size - 1) * this.spaceLengthCubies;
        this.initializeCubeRotationBindings();
        this.initializeVisualCubeLayout();
        this.initializeCubeSlices();

        this.cubies.forEach((cubie: THREE.Mesh) => this.elementsInScene.add(cubie));
        this.cubeSlices.forEach((cubeSlice: THREE.Mesh) => this.elementsInScene.add(cubeSlice));
    }

    private initializeCubeRotationBindings() {
        this.moves[MoveType3By3.LEFT] = new Move(new THREE.Vector3(0, 0, 1), Math.PI / 2, Key.L, MoveType3By3.LEFT);
        this.moves[MoveType3By3.MIDDLE] = new Move(new THREE.Vector3(0, 0, 1), Math.PI / 2, Key.M, MoveType3By3.MIDDLE);
        this.moves[MoveType3By3.RIGHT] = new Move(new THREE.Vector3(0, 0, 1), -Math.PI / 2, Key.R, MoveType3By3.RIGHT);

        this.moves[MoveType3By3.FRONT] = new Move(new THREE.Vector3(1, 0, 0), Math.PI / 2, Key.F, MoveType3By3.FRONT);
        this.moves[MoveType3By3.SIDE] = new Move(new THREE.Vector3(1, 0, 0), Math.PI / 2, Key.S, MoveType3By3.SIDE);
        this.moves[MoveType3By3.BACK] = new Move(new THREE.Vector3(1, 0, 0), -Math.PI / 2, Key.B, MoveType3By3.BACK);

        this.moves[MoveType3By3.DOWN] = new Move(new THREE.Vector3(0, 1, 0), Math.PI / 2, Key.D, MoveType3By3.DOWN);
        this.moves[MoveType3By3.E] = new Move(new THREE.Vector3(0, 1, 0), Math.PI / 2, Key.E, MoveType3By3.E);
        this.moves[MoveType3By3.UP] = new Move(new THREE.Vector3(0, 1, 0), -Math.PI / 2, Key.U, MoveType3By3.UP);
    }

    private initializeVisualCubeLayout(): void {
        const maxCoord = (this.size - 1) / 2;
        const minCoord = -maxCoord;
    
        for (let x = minCoord; x <= maxCoord; ++x) {
          for (let y = minCoord; y <= maxCoord; ++y) {
            for (let z = minCoord; z <= maxCoord; ++z) {
              if (this.isValidCubie(x, y, z, minCoord, maxCoord)) {
                const cubie = this.cubieMesh.clone();
                const cubiePosition = new THREE.Vector3(
                  x * (this.spaceLengthCubies + this.cubieLength / 2),
                  y * (this.spaceLengthCubies + this.cubieLength / 2),
                  z * (this.spaceLengthCubies + this.cubieLength / 2)
                );
                
                cubie.position.copy(cubiePosition);
                // yes yes, i know... magic number of scaling it by 0.25
                cubie.scale.set(this.cubieLength/4, this.cubieLength/4, this.cubieLength/4);
                cubie.matrixAutoUpdate = true;
                this.cubies.push(cubie);
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
        scene.add(this.elementsInScene);
      }

      public handleKeyDownEvent(keyDownEvent: KeyboardEvent) {
        // todo: better this part
        for(let moveIt in this.moves) {
          let move = this.moves[moveIt];
          if(move.keyCode == keyDownEvent.keyCode) {
            this.rotateSlice(move);
          }
        }
      }
    
      public rotateSlice(move: Move) {
        const slice = this.cubeSlices[move.type]; // copy slice in the move instead of the type?
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
    
          // Take the cube out of the group, place directly onto scene
          // TODO: CHANGE
          this.elementsInScene.add(this.cubies[instanceIndex]);
    
          // Now we re-apply the world rotations to the cube
          this.cubies[instanceIndex].quaternion.copy(tempQuaternion);
          this.cubies[instanceIndex].position.copy(tempPosition);
        });
      }
    
      private initializeCubeSlices(): void {
        this.cubeSlices = [];
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
    
            const boxGeometry = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1),
              new THREE.MeshBasicMaterial({ color: 0xff0000, visible:false }) // red color to debug when visible is true
            );
    
            const slicePosition = positionSelector[i].clone().multiplyScalar(coord * (this.spaceLengthCubies + this.cubieLength));
            boxGeometry.position.copy(slicePosition);
    
            const dimensionsSlice = dimensionsSelector[i].clone().multiplyScalar(this.cubeSideLength).add(positionSelector[i].clone().multiplyScalar(this.cubieLength / 2));
            boxGeometry.scale.copy(dimensionsSlice);

            // Add the invisible cube slice to the array
            this.cubeSlices.push(boxGeometry);
          }
        }
      }
    
      private isValidCubie(x: number, y: number, z: number, minCoord: number, maxCoord: number): boolean {
        return (
          x === minCoord || x === maxCoord ||
          y === minCoord || y === maxCoord ||
          z === minCoord || z === maxCoord
        );
      }
}