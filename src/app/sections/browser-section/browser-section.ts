///<reference path='../../../../global.d.ts'/>
import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import {
  BROWSER_SECTION_TEMPLATE_VARIABLES,
  BROWSER_SECTION_NOTIFICATION_MESSAGES,
} from './browser-section.constants';
import { SectionBase } from '../section-base';

@Component({
  selector: 'app-browser-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzTooltipModule],
  templateUrl: './browser-section.html',
  styleUrl: './browser-section.css',
})
export class BrowserSection extends SectionBase {
  protected readonly templateVariables = BROWSER_SECTION_TEMPLATE_VARIABLES;
  protected readonly notifications = BROWSER_SECTION_NOTIFICATION_MESSAGES;

  linkForSecondTab = model<string>('');

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
}
