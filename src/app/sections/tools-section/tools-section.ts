///<reference path='../../../../global.d.ts'/>
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import {
  TOOLS_SECTION_TEMPLATE_VARIABLES,
  TOOLS_SECTION_NOTIFICATION_MESSAGES,
} from './tools-section.constants';
import { SectionBase } from '../section-base';

@Component({
  selector: 'app-tools-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzTooltipModule],
  templateUrl: './tools-section.html',
  styleUrl: './tools-section.css',
})
export class ToolsSection extends SectionBase implements OnChanges {
  protected readonly templateVariables = TOOLS_SECTION_TEMPLATE_VARIABLES;
  protected readonly notifications = TOOLS_SECTION_NOTIFICATION_MESSAGES;

  @Input() isHandledPageReady = false;

  isNetworkLogging = false;
  isConsoleLogging = false;

  ngOnChanges(changes: SimpleChanges): void {
    // Если управляемое окно закрылось — сбрасываем локальное состояние
    // кнопок логирования, т.к. main-процесс уже остановил логгеры
    // (см. `mainWindow.on('closed')` и `handledBrowserWindow.on('closed')`).
    if (
      changes['isHandledPageReady'] &&
      !changes['isHandledPageReady'].currentValue
    ) {
      this.isNetworkLogging = false;
      this.isConsoleLogging = false;
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
