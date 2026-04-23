///<reference path='../../../global.d.ts'/>
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TERMINAL_TEMPLATE_VARIABLES } from './terminal.constants';

type LogSource = 'network' | 'console';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzSpaceModule,
  ],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.css',
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  protected readonly templateVariables = TERMINAL_TEMPLATE_VARIABLES;

  showNetwork = true;
  showConsole = true;

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private resizeObserver?: ResizeObserver;
  private unsubscribe?: () => void;
  private windowResizeHandler = () => this.scheduleFit();
  private fitRafId: number | null = null;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.terminal = new Terminal({
        convertEol: true,
        fontSize: 12,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
        scrollback: 5000,
      });
      this.fitAddon = new FitAddon();
      this.terminal.loadAddon(this.fitAddon);
      this.terminal.open(this.hostRef.nativeElement);
      this.scheduleFit();

      this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
      this.resizeObserver.observe(this.hostRef.nativeElement);

      window.addEventListener('resize', this.windowResizeHandler);

      this.terminal.writeln(
        `\x1b[90m${TERMINAL_TEMPLATE_VARIABLES.banners.ready}\x1b[0m`,
      );

      this.unsubscribe = window.api.onLoggerLine(({ source, line }) => {
        if (source === 'network' && !this.showNetwork) return;
        if (source === 'console' && !this.showConsole) return;
        const color = source === 'network' ? '\x1b[36m' : '\x1b[33m';
        const tag =
          source === 'network'
            ? TERMINAL_TEMPLATE_VARIABLES.sourceTags.network
            : TERMINAL_TEMPLATE_VARIABLES.sourceTags.console;
        this.terminal?.writeln(`${color}[${tag}]\x1b[0m ${line}`);
      });
    });
  }

  clear(): void {
    this.terminal?.clear();
  }

  onFilterChange(_source: LogSource): void {
    // no-op — filter consulted on each incoming line
  }

  private scheduleFit(): void {
    // rAF + отмена предыдущего кадра — ломает цепочку ResizeObserver → fit → ResizeObserver
    if (this.fitRafId !== null) return;
    this.fitRafId = requestAnimationFrame(() => {
      this.fitRafId = null;
      try {
        this.fitAddon?.fit();
      } catch {
        /* ignore */
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    if (this.fitRafId !== null) cancelAnimationFrame(this.fitRafId);
    window.removeEventListener('resize', this.windowResizeHandler);
    this.terminal?.dispose();
  }
}
