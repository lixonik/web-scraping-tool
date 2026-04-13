///<reference path='../../global.d.ts'/>
import { RouterOutlet } from '@angular/router';
import { Component, inject, model } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NzInputModule, NzInputSearchEvent } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    // RouterOutlet,
    NzInputModule,
    NzButtonModule,
    NzDividerModule,
    NzSpaceModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  http = inject(HttpClient);
  linkForSecondTab = model<string>('');

  testHttpProxy() {
    this.http.get('test-http', { responseType: 'text' }).subscribe((data) => {
      console.log('+++++++++++++++ data from test playwright proxy', data);
    });
  }

  screen() {
    console.dirxml('screen');
  }

  runPlaywright() {
    window.api.runPl();
  }

  onOpen(event: NzInputSearchEvent) {
    window.api.openNewTab(event.value);
  }

  onSendLocator(event: NzInputSearchEvent) {
    window.api.onSendLocator(event.value);
  }

  isNetworkLogging = false;

  toggleNetworkLogging() {
    if (this.isNetworkLogging) {
      window.api.stopNetworkLogging();
    } else {
      window.api.startNetworkLogging();
    }
    this.isNetworkLogging = !this.isNetworkLogging;
  }
}
