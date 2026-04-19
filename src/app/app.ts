///<reference path='../../global.d.ts'/>
import {
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
  model,
} from '@angular/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TerminalComponent } from './terminal/terminal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NzInputModule,
    NzButtonModule,
    NzDividerModule,
    NzSpaceModule,
    NzTooltipModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TerminalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private zone = inject(NgZone);
  linkForSecondTab = model<string>('');
  readonly openHandledWindowHint = 'Open handled window first';

  isHandledPageReady = false;
  isNetworkLogging = false;
  isConsoleLogging = false;
  locatorValue = '';

  get isValidUrl(): boolean {
    const v = this.linkForSecondTab();
    if (!v) return false;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  get canLocate(): boolean {
    return this.isHandledPageReady && this.locatorValue.trim().length > 0;
  }

  private unsubscribeStatus?: () => void;

  ngOnInit(): void {
    this.unsubscribeStatus = window.api.onHandledPageStatus(({ ready }) => {
      // IPC-callback прилетает вне Angular-зоны — без zone.run() change detection не сработает
      this.zone.run(() => {
        this.isHandledPageReady = ready;
        if (!ready) {
          this.isNetworkLogging = false;
          this.isConsoleLogging = false;
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeStatus?.();
  }

  onOpen() {
    if (!this.isValidUrl) return;
    window.api.openNewTab(this.linkForSecondTab() || '');
  }

  onSendLocator() {
    if (!this.canLocate) return;
    window.api.onSendLocator(this.locatorValue);
  }

  toggleNetworkLogging() {
    if (this.isNetworkLogging) {
      window.api.stopNetworkLogging();
    } else {
      window.api.startNetworkLogging();
    }
    this.isNetworkLogging = !this.isNetworkLogging;
  }

  toggleConsoleLogging() {
    if (this.isConsoleLogging) {
      window.api.stopConsoleLogging();
    } else {
      window.api.startConsoleLogging();
    }
    this.isConsoleLogging = !this.isConsoleLogging;
  }
}
