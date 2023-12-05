import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, Inject, NgZone, PLATFORM_ID, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import { isPlatformBrowser } from '@angular/common';
import { Key } from 'ts-keycode-enum';
import { Move, MoveType3By3 } from '../move';

@Component({
  selector: 'app-threed-scene',
  standalone: true,
  imports: [],
  templateUrl: './threed-scene.component.html',
  host: {ngSkipHydration: 'true'},
  styleUrl: './threed-scene.component.css'
})
export class ThreedSceneComponent implements OnInit, OnChanges, OnDestroy {
  
  scene: THREE.Scene = new THREE.Scene();
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  cubeSlices!: THREE.Mesh[];
  cubies = new Array<THREE.Mesh>();
  isBrowser: boolean;
  cubieLength: number = 0;
  spaceLengthCubies: number = 100;
  cubeSideLength: number = 0;
  moves: { [id: number] : Move; } = {};


  constructor(@Inject(PLATFORM_ID) private platformId: object, private ngZone: NgZone) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.moves[MoveType3By3.LEFT] = new Move(new THREE.Vector3(0, 0, 1), Math.PI/2, Key.L, MoveType3By3.LEFT);
    this.moves[MoveType3By3.MIDDLE] = new Move(new THREE.Vector3(0, 0, 1), Math.PI/2, Key.M, MoveType3By3.MIDDLE);
    this.moves[MoveType3By3.RIGHT] = new Move(new THREE.Vector3(0, 0, 1), -Math.PI/2, Key.R, MoveType3By3.RIGHT);
    
    this.moves[MoveType3By3.FRONT] = new Move(new THREE.Vector3(1, 0, 0), Math.PI/2, Key.F, MoveType3By3.FRONT);
    this.moves[MoveType3By3.SIDE] = new Move(new THREE.Vector3(1, 0, 0), Math.PI/2, Key.S, MoveType3By3.SIDE);
    this.moves[MoveType3By3.BACK] = new Move(new THREE.Vector3(1, 0, 0), -Math.PI/2, Key.B, MoveType3By3.BACK);

    this.moves[MoveType3By3.DOWN] = new Move(new THREE.Vector3(0, 1, 0), Math.PI/2, Key.D, MoveType3By3.DOWN);
    this.moves[MoveType3By3.E] = new Move(new THREE.Vector3(0, 1, 0), Math.PI/2, Key.E, MoveType3By3.E);
    this.moves[MoveType3By3.UP] = new Move(new THREE.Vector3(0, 1, 0), -Math.PI/2, Key.U, MoveType3By3.UP);
  }

  ngOnDestroy(): void {
    //throw new Error('Method not implemented.');
  }

  ngOnChanges(changes: SimpleChanges): void {
    //throw new Error('Method not implemented.');
  }

  animate(): void {
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate.bind(this));
  }

  ngOnInit(): void {
    if(this.isBrowser) {
      this.scene.background = new THREE.Color(0xdddddd);

      this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 10000);
      this.camera.position.x = -500;
      this.camera.position.y = 0;
      this.camera.position.z = 0;
      this.camera.rotation.set(-Math.PI / 4, 0, 0);

      let hlight = new THREE.AmbientLight (0x404040, 100);
      this.scene.add(hlight);

      this.renderer = new THREE.WebGLRenderer({antialias:true});
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      let controls = new OrbitControls(this.camera, this.renderer.domElement);
      controls.addEventListener('change', () => this.renderer.render(this.scene, this.camera));

      let loader = new FBXLoader();
      loader.load('/assets/CubieWithColors.fbx', (fbx) => {
          fbx.children.forEach(child => {

            if(child instanceof THREE.Mesh) {
              this.cubieLength = (child as THREE.Mesh).scale.x;
              this.spaceLengthCubies = 1.0;
              this.cubeSideLength = 2 * this.cubieLength + (2 - 1) * this.spaceLengthCubies;;
              this.initializeVisualCubeLayout(2, child as THREE.Mesh);
              this.cubeSlices = this.initializeCubeSlices(2);
            }

          });

          this.ngZone.runOutsideAngular(() => this.animate());
      });
    }
  }

  @HostListener('document:keydown', ['$event'])
  public handleKeyDown(keyDownEvent: KeyboardEvent) {
    // todo: better this part
    for(let moveIt in this.moves) {
      let move = this.moves[moveIt];
      if(move.keyCode == keyDownEvent.keyCode) {
        this.rotateSlice(move);
      }
    }
  }

  private initializeVisualCubeLayout(nbCubies: number, cubieMesh: THREE.Mesh): void {
    const maxCoord = nbCubies / 2;
    const minCoord = -maxCoord;

    for (let x = minCoord; x <= maxCoord; ++x) {
      for (let y = minCoord; y <= maxCoord; ++y) {
        for (let z = minCoord; z <= maxCoord; ++z) {
          if (this.isValidCubie(x, y, z, minCoord, maxCoord)) {
            const cubie = cubieMesh.clone();
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
            this.scene.add(cubie);
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


  private rotateSlice(move: Move): void {
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
    this.scene.add(group);

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
      this.scene.add(this.cubies[instanceIndex]);

      // Now we re-apply the world rotations to the cube
      this.cubies[instanceIndex].quaternion.copy(tempQuaternion);
      this.cubies[instanceIndex].position.copy(tempPosition);
    });
  }

  private initializeCubeSlices(nbCubies: number): THREE.Mesh[] {
    const invisibleCubeSlices: THREE.Mesh[] = [];
    const nbDimensions = 3;
    const dimensionIdentifier = ['X', 'Y', 'Z'];
    const positionSelector = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const dimensionsSelector = [new THREE.Vector3(0, 1, 1), new THREE.Vector3(1, 0, 1), new THREE.Vector3(1, 1, 0)];
  
    const maxCoord = nbCubies / 2;
    const minCoord = -maxCoord;
  
    let sliceIdentifier: string;
  
    // const invisibleMaterial = new THREE.MeshBasicMaterial({visible: false });
    const invisibleMaterial = new THREE.MeshNormalMaterial({vertexColors:true,blendColor:'red'});

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

        this.scene.add(boxGeometry);

        // Add the invisible cube slice to the array
        invisibleCubeSlices.push(boxGeometry);
      }
    }
  
    console.log(invisibleCubeSlices);
    return invisibleCubeSlices;
  }
  

  private isValidCubie(x: number, y: number, z: number, minCoord: number, maxCoord: number): boolean {
    return (
      x === minCoord || x === maxCoord ||
      y === minCoord || y === maxCoord ||
      z === minCoord || z === maxCoord
    );
  }
}
