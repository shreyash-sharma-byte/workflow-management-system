import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _loading = new BehaviorSubject<boolean>(false);
  loading$ = this._loading.asObservable();
  private requests = 0;

  show(): void {
    this.requests++;
    this._loading.next(true);
  }

  hide(): void {
    this.requests = Math.max(0, this.requests - 1);
    if (this.requests === 0) this._loading.next(false);
  }
}
