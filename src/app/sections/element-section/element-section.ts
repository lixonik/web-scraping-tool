///<reference path='../../../../global.d.ts'/>
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import {
  ELEMENT_SECTION_TEMPLATE_VARIABLES,
  ELEMENT_SECTION_NOTIFICATION_MESSAGES,
} from './element-section.constants';
import { SectionBase } from '../section-base';

@Component({
  selector: 'app-element-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzTooltipModule],
  templateUrl: './element-section.html',
  styleUrl: './element-section.css',
})
export class ElementSection extends SectionBase {
  protected readonly templateVariables = ELEMENT_SECTION_TEMPLATE_VARIABLES;
  protected readonly notifications = ELEMENT_SECTION_NOTIFICATION_MESSAGES;

  @Input() isHandledPageReady = false;

  locatorValue = '';

  get canLocate(): boolean {
    return this.isHandledPageReady && this.locatorValue.trim().length > 0;
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
}
