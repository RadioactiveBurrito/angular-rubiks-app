import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import { isPlatformBrowser } from '@angular/common';

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
  isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: object, private ngZone: NgZone) {
    this.isBrowser = isPlatformBrowser(this.platformId);
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
      this.camera.position.x = -10;
      this.camera.position.y = 0;
      this.camera.position.z = 0;
      this.camera.rotation.set(-Math.PI / 4, 0, 0);

      let hlight = new THREE.AmbientLight (0x404040, 100);
      this.scene.add(hlight);

      //Adding directional lights
      let directionalLight = new THREE.DirectionalLight(0xffffff, 100);
      directionalLight.position.set(0,1,0);
      directionalLight.castShadow = true;
      this.scene.add(directionalLight);

      //Adding Shadow
      let light = new THREE.PointLight(0xc4c4c4,10);
      light.position.set(0,300,500);
      this.scene.add(light);

      let light2 = new THREE.PointLight(0xc4c4c4,10);
      light2.position.set(500,100,0);
      this.scene.add(light2);

      let light3 = new THREE.PointLight(0xc4c4c4,10);
      light3.position.set(0,100,-500);
      this.scene.add(light3);

      let light4 = new THREE.PointLight(0xc4c4c4,10);
      light4.position.set(-500,300,0);
      this.scene.add(light4);

      this.renderer = new THREE.WebGLRenderer({antialias:true});
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      let controls = new OrbitControls(this.camera, this.renderer.domElement);
      controls.addEventListener('change', () => this.renderer.render(this.scene, this.camera));

      let loader = new FBXLoader();
      loader.load('/assets/CubieWithColors.fbx', (fbx) => {
          fbx.children.forEach(child => {
            this.initializeVisualCubeLayout(2, child as THREE.Mesh)
          });

          this.ngZone.runOutsideAngular(() => this.animate());
      });
    }
  }

  public initializeVisualCubeLayout(nbCubies: number, cubieMesh: THREE.Mesh): void {
    const spaceLengthCubies = 1.0; // Adjust as needed
    const cubieLength = 0.1; // Adjust as needed

    const maxCoord = nbCubies / 2;
    const minCoord = -maxCoord;

    for (let x = minCoord; x <= maxCoord; ++x) {
      for (let y = minCoord; y <= maxCoord; ++y) {
        for (let z = minCoord; z <= maxCoord; ++z) {
          if (this.isValidCubie(x, y, z, minCoord, maxCoord)) {
            const cubie = cubieMesh.clone();
            const cubiePosition = new THREE.Vector3(
              x * (spaceLengthCubies + cubieLength / 2),
              y * (spaceLengthCubies + cubieLength / 2),
              z * (spaceLengthCubies + cubieLength / 2)
            );

            cubie.position.copy(cubiePosition);
            cubie.scale.set(0.5, 0.5, 0.5);

            //this.cubies.push(cubie);
            this.scene.add(cubie);
          }
        }
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
