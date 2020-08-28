import {Component, ChangeDetectionStrategy, OnInit} from '@angular/core';
import { FormControl } from '@angular/forms';

import { Observable } from 'rxjs';

import {UserFacade, UserState} from './user.facade';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  searchTerm: FormControl;
  showButton = true;
  vm$: Observable<UserState> = this.facade.vm$;

  constructor(private facade: UserFacade) { }

  ngOnInit(): void {
    const { criteria } = this.facade.getStateSnapshot();
    this.searchTerm = this.facade.buildSearchTermControl();
    this.searchTerm.patchValue(criteria, { emitEvent: false });
  }

  getPageSize(): void {
    this.showButton = false;
  }

  search(pageSize: number): void {
    this.facade.updatePagination(pageSize);
  }
}
