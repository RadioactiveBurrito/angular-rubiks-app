import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThreedSceneComponent } from './threed-scene/threed-scene.component';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ThreedSceneComponent],
  templateUrl: './app.component.html',
  host: {ngSkipHydration: 'true'},
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'rubiks-app';
}
