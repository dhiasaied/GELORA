import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  /** True once the 3D stage has rendered its first frame. */
  readonly sceneReady = signal(false);
  /** True once the preloader has finished its exit animation. */
  readonly introDone = signal(false);
  readonly menuOpen = signal(false);
}
