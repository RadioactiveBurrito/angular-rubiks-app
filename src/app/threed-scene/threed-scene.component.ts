import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, Inject, NgZone, PLATFORM_ID, HostListener, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import { isPlatformBrowser } from '@angular/common';
import { IAnimate, Rubiks } from '../../classes/rubiks';
import { GenericMoveCodeToRotationBindingsInitializer, ThreeByThreeMoveCodeToRotationBindingsInitializer, TwoByTwoMoveCodeToRotationBindingsInitializer } from '../../classes/moveRotationInitializer';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NaiveTwoByTwoRubiksSolver, StandardSolutionExecuter } from '../../classes/solver';
import { Move } from '../../classes/move';

@Component({
  selector: 'app-threed-scene',
  standalone: true,
  imports: [MatInputModule, MatFormFieldModule],
  templateUrl: './threed-scene.component.html',
  host: {ngSkipHydration: 'true'},
  styleUrl: './threed-scene.component.css'
})
export class ThreedSceneComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  scene: THREE.Scene = new THREE.Scene();
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  isBrowser: boolean;
  rubiks!: Rubiks;
  animateObjects: IAnimate[] = new Array<IAnimate>();


  @HostListener('document:keydown', ['$event'])
  handleKeyDown(keyDownEvent: KeyboardEvent) {
    this.rubiks.handleKeyDownEvent(keyDownEvent);
  }

  @HostListener('document:mousedown', ['$event'])
  handleOnMouseDown(mouseDown: MouseEvent) {
    const solver = new NaiveTwoByTwoRubiksSolver();
    const solution = solver.solve(this.rubiks);
    const solutionMoves = new Array<Move>();
    solution.forEach((moveCode) => {
      solutionMoves.push(this.rubiks.getMove(moveCode));
    });
    const executer = new StandardSolutionExecuter();
    executer.execute(solutionMoves, this.rubiks);
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: Event) {
    this.updateCameraAspect();
  }

  updateCameraAspect() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }


  constructor(@Inject(PLATFORM_ID) private platformId: object, private ngZone: NgZone) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnDestroy(): void {
    //throw new Error('Method not implemented.');
  }

  ngOnChanges(changes: SimpleChanges): void {
    //throw new Error('Method not implemented.');
  }

  ngAfterViewInit(): void {
    if(this.isBrowser) {
      this.scene.background = new THREE.Color(0x0);

      this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 10000);
      this.camera.position.x = -500;
      this.camera.position.y = 250;
      this.camera.position.z = 0;
      this.camera.rotation.set(-Math.PI / 4, 0, 0);

      let hlight = new THREE.AmbientLight (0x404040, 50);
      this.scene.add(hlight);

      setTimeout(() => {
        let canvas = document.querySelector("#scene");
        this.renderer = new THREE.WebGLRenderer({
          antialias:true,
          canvas: canvas!,
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(devicePixelRatio);
        let controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.addEventListener('change', () => this.renderer.render(this.scene, this.camera));

        let loader = new FBXLoader();
        loader.load('/assets/CubieWithColors.fbx', (fbx) => {
            fbx.children.forEach(child => {
              if(child instanceof THREE.Mesh) {
                this.rubiks = new Rubiks(child, new GenericMoveCodeToRotationBindingsInitializer(), 2);
                this.rubiks.addToScene(this.scene);
                this.animateObjects.push(this.rubiks);
              }
            });

            this.ngZone.runOutsideAngular(() => {
              this.renderer.setAnimationLoop(() => {
                // render a frame
                this.animateObjects.forEach((animateObject) => animateObject.doAnimationFrame());
                this.renderer.render(this.scene, this.camera);
              });
            });
        });}, 500);
      };
  }

  ngOnInit(): void {

  }
}
