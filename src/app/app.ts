///<reference path='../../global.d.ts'/>
import {
  ApplicationRef,
  ChangeDetectorRef,
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
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TerminalComponent } from './terminal/terminal.component';
import { APP_TEMPLATE_VARIABLES } from './app.constants';
import { NOTIFICATION_MESSAGES } from './notifications.constants';

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
  private cdr = inject(ChangeDetectorRef);
  private appRef = inject(ApplicationRef);
  private notification = inject(NzNotificationService);
  protected readonly templateVariables = APP_TEMPLATE_VARIABLES;
  protected readonly notifications = NOTIFICATION_MESSAGES;
  linkForSecondTab = model<string>('');

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
      // IPC-callback прилетает вне Angular-зоны; zone.run() планирует CD,
      // но когда управляющее окно не в фокусе, Chromium тормозит rAF,
      // и change detection откладывается до возврата фокуса. Форсируем тик.
      this.zone.run(() => {
        this.isHandledPageReady = ready;
        if (!ready) {
          this.isNetworkLogging = false;
          this.isConsoleLogging = false;
        }
        this.cdr.markForCheck();
        this.appRef.tick();
      });
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeStatus?.();
  }

  /**
   * Выполнить синхронный блок внутри Angular-зоны и принудительно
   * прогнать change detection. Нужно для continuation после `await ipcRenderer.invoke(...)`:
   * IPC-continuation приходит вне зоны, а когда управляющее окно не в фокусе,
   * Chromium тормозит rAF → CD откладывается и кнопки не перерисовываются.
   */
  private runInZone(fn: () => void): void {
    this.zone.run(() => {
      fn();
      this.cdr.markForCheck();
      this.appRef.tick();
    });
  }

  async onOpen(): Promise<void> {
    if (!this.isValidUrl) return;
    const url = this.linkForSecondTab() || '';
    const n = this.notifications.handledWindow;
    try {
      const res = await window.api.openNewTab(url);
      this.runInZone(() => {
        if (res.ok) {
          this.notification.success(n.title, `${n.openedPrefix} ${url}`);
        } else {
          this.notification.error(n.title, res.message ?? n.fallbackFailed);
        }
      });
    } catch (err) {
      this.runInZone(() => this.notification.error(n.title, String(err)));
    }
  }

  async onSendLocator(): Promise<void> {
    if (!this.canLocate) return;
    const n = this.notifications.elementSave;
    try {
      const res = await window.api.onSendLocator(this.locatorValue);
      this.runInZone(() => {
        if (res.ok) {
          this.notification.success(
            n.successTitle,
            res.path ?? this.locatorValue,
          );
        } else {
          this.notification.error(
            n.errorTitle,
            res.message ?? n.fallbackError,
          );
        }
      });
    } catch (err) {
      this.runInZone(() =>
        this.notification.error(n.errorTitle, String(err)),
      );
    }
  }

  async toggleNetworkLogging(): Promise<void> {
    const n = this.notifications.networkLogging;
    if (this.isNetworkLogging) {
      try {
        const res = await window.api.stopNetworkLogging();
        this.runInZone(() => {
          if (res.ok) {
            this.notification.success(
              n.stoppedTitle,
              res.logFilePath ?? n.fallbackLogSaved,
            );
            this.isNetworkLogging = false;
          } else {
            this.notification.error(
              n.stopFailedTitle,
              res.message ?? n.fallbackError,
            );
          }
        });
      } catch (err) {
        this.runInZone(() =>
          this.notification.error(n.stopFailedTitle, String(err)),
        );
      }
    } else {
      try {
        const res = await window.api.startNetworkLogging();
        this.runInZone(() => {
          if (res.ok) {
            this.notification.info(n.startedTitle, res.logFilePath ?? '');
            this.isNetworkLogging = true;
          } else {
            this.notification.error(
              n.startFailedTitle,
              res.message ?? n.fallbackError,
            );
          }
        });
      } catch (err) {
        this.runInZone(() =>
          this.notification.error(n.startFailedTitle, String(err)),
        );
      }
    }
  }

  async toggleConsoleLogging(): Promise<void> {
    const n = this.notifications.consoleLogging;
    if (this.isConsoleLogging) {
      try {
        const res = await window.api.stopConsoleLogging();
        this.runInZone(() => {
          if (res.ok) {
            this.notification.success(
              n.stoppedTitle,
              res.logFilePath ?? n.fallbackLogSaved,
            );
            this.isConsoleLogging = false;
          } else {
            this.notification.error(
              n.stopFailedTitle,
              res.message ?? n.fallbackError,
            );
          }
        });
      } catch (err) {
        this.runInZone(() =>
          this.notification.error(n.stopFailedTitle, String(err)),
        );
      }
    } else {
      try {
        const res = await window.api.startConsoleLogging();
        this.runInZone(() => {
          if (res.ok) {
            this.notification.info(n.startedTitle, res.logFilePath ?? '');
            this.isConsoleLogging = true;
          } else {
            this.notification.error(
              n.startFailedTitle,
              res.message ?? n.fallbackError,
            );
          }
        });
      } catch (err) {
        this.runInZone(() =>
          this.notification.error(n.startFailedTitle, String(err)),
        );
      }
    }
  }

  async openOutputFolder(): Promise<void> {
    const n = this.notifications.openOutputFolder;
    try {
      const res = await window.api.openOutputFolder();
      if (!res.ok) {
        this.runInZone(() =>
          this.notification.error(
            n.errorTitle,
            res.message ?? n.fallbackError,
          ),
        );
      }
    } catch (err) {
      this.runInZone(() =>
        this.notification.error(n.errorTitle, String(err)),
      );
    }
  }
}
