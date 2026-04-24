import {
  ApplicationRef,
  ChangeDetectorRef,
  NgZone,
  inject,
} from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';

/**
 * База для секций управляющего окна. Содержит `runInZone` — обёртку,
 * которая заводит изменения состояния и уведомления обратно в Angular-зону
 * и принудительно прогоняет change detection. Нужно для continuation'ов
 * после `await ipcRenderer.invoke(...)`: они приходят вне зоны, а когда
 * управляющее окно не в фокусе, Chromium дросселит rAF → CD откладывается
 * до возврата фокуса, и UI не обновляется.
 */
export abstract class SectionBase {
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly appRef = inject(ApplicationRef);
  protected readonly notification = inject(NzNotificationService);

  protected runInZone(fn: () => void): void {
    this.zone.run(() => {
      fn();
      this.cdr.markForCheck();
      this.appRef.tick();
    });
  }
}
