///<reference path='../../global.d.ts'/>
import {
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { TerminalComponent } from './terminal/terminal.component';
import { BrowserSection } from './sections/browser-section/browser-section';
import { ElementSection } from './sections/element-section/element-section';
import { ToolsSection } from './sections/tools-section/tools-section';
import { APP_TEMPLATE_VARIABLES } from './app.constants';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NzDividerModule,
    TerminalComponent,
    BrowserSection,
    ElementSection,
    ToolsSection,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly appRef = inject(ApplicationRef);
  protected readonly templateVariables = APP_TEMPLATE_VARIABLES;

  isHandledPageReady = false;

  private unsubscribeStatus?: () => void;

  ngOnInit(): void {
    this.unsubscribeStatus = window.api.onHandledPageStatus(({ ready }) => {
      // IPC-callback прилетает вне Angular-зоны; zone.run() планирует CD,
      // но когда управляющее окно не в фокусе, Chromium тормозит rAF,
      // и change detection откладывается до возврата фокуса. Форсируем тик.
      this.zone.run(() => {
        this.isHandledPageReady = ready;
        this.cdr.markForCheck();
        this.appRef.tick();
      });
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeStatus?.();
  }
}
