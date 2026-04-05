///<reference path='../../global.d.ts'/>
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Component, inject, model } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NzInputModule, NzInputSearchEvent } from 'ng-zorro-antd/input';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    NzInputModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  template: `
    <button id="yadro" (click)="runPlaywright()">run playwright</button>
    <button (click)="screen()">screen</button>
    <button (click)="testHttpProxy()">testHttpProxy</button>
    <button (click)="fetchLocalHost()">fetch</button>
    <nz-input-search (nzSearch)="onOpen($event)">
      <span nzInputAddonBefore>https://</span>
      <input
        nz-input
        [(ngModel)]="linkForSecondTab"
        placeholder="input search text"
      />
    </nz-input-search>
    <nz-input-search (nzSearch)="onSendLocator($event)">
      <span nzInputAddonBefore>https://</span>
      <input nz-input placeholder="input search text" />
    </nz-input-search>

    <ul>
      <li data-test-id="home-link">
        <a routerLink="/home" routerLinkActive="active">Home</a>
      </li>
      <li id="two-route-link">
        <a routerLink="/pokemon" routerLinkActive="active">Show Pokemon</a>
      </li>
      <li id="three-route-link">
        <a routerLink="/bad" routerLinkActive="active">Bad route</a>
      </li>
    </ul>
    <router-outlet></router-outlet>
  `,
  styles: [``],
})
export class App {
  http = inject(HttpClient);
  linkForSecondTab = model<string>('');
  // locator = model<string>('');

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

  fetchLocalHost() {
    this.http.get('http://127.0.0.1:9221/json').subscribe(console.log);
  }
}
