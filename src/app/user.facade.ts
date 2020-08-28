import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {BehaviorSubject, Observable, combineLatest} from 'rxjs';
import {debounceTime, distinctUntilChanged, map, switchMap, tap} from 'rxjs/operators';
import produce from 'immer';
import {FormControl} from '@angular/forms';
import { get } from 'lodash';

export interface User {
  gender: string;
  name: {
    first: string;
    last: string;
  };
}

export interface Pagination {
  selectedSize: number;
  currentPage: number;
  pageSizes: number[];
}

export interface RandomUserResponse {
  results: User[];
}

export interface UserState {
  users: User[];
  pagination: Pagination;
  criteria: string;
  loading: boolean;
}

// tslint:disable-next-line:variable-name
let _state: UserState = {
  users: [],
  criteria: 'ngDominican',
  pagination: {
    currentPage: 0,
    selectedSize: 5,
    pageSizes: [5, 10, 20, 50]
  },
  loading: false
};

@Injectable()
export class UserFacade {
  private store = new BehaviorSubject<UserState>(_state);
  private state$ = this.store.asObservable();

  private users$: Observable<User[]> = this.makeState('users');
  private criteria$: Observable<string> = this.makeState('criteria');
  private pagination$: Observable<Pagination> = this.makeState('pagination');
  private loading$: Observable<boolean> = this.makeState('loading');

  /**
   * Viewmodel that resolves once all the data is ready (or updated)...
   */
  vm$: Observable<UserState> = combineLatest([this.pagination$, this.criteria$, this.users$, this.loading$]).pipe(
    map(([pagination, criteria, users, loading]) => {
      return {pagination, criteria, users, loading};
    })
  );

  makeState<T>(value: string): Observable<T> {
    return this.state$.pipe(map(state => get(state, value)), distinctUntilChanged());
  }

  constructor(private http: HttpClient) {
    const usersStream$ = combineLatest([this.criteria$, this.pagination$]).pipe(
      switchMap(([criteria, pagination]) => {
        return this.findAllUsers(criteria, pagination);
      })
    );
    const updateUser = users => {
      const nextState = produce(_state, draftState => {
        draftState.users = users;
        draftState.loading = false;
      });
      this.updateState(nextState);
    };
    usersStream$.subscribe(updateUser);
  }

  getStateSnapshot(): UserState {
    return {..._state, pagination: {..._state.pagination}};
  }

  buildSearchTermControl(): FormControl {
    const searchTerm = new FormControl();
    searchTerm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => this.updateSearchCriteria(value));

    return searchTerm;
  }

  updateSearchCriteria(criteria: string): void {
    const nextState = produce(_state, draftState => {
      draftState.criteria = criteria;
      draftState.loading = true;
    });
    this.updateState(nextState);
  }

  updatePagination(selectedSize: number, currentPage: number = 0): void {
    const nextState = produce(_state, draftState => {
      draftState.pagination.selectedSize = selectedSize;
      draftState.pagination.currentPage = currentPage;
      draftState.loading = true;
    });
    this.updateState(nextState);
  }

  /** Update internal state cache and emit from store... */
  private updateState(state: UserState): void {
    this.store.next(_state = state);
  }

  /** RandomUser REST call */
  private findAllUsers(criteria: string, pagination: Pagination): Observable<User[]> {
    const url = buildUserUrl(criteria, pagination);
    return this.http.get<RandomUserResponse>(url).pipe(
      map(response => response.results)
    );
  }
}

function buildUserUrl(criteria: string, pagination: Pagination): string {
  const URL = 'https://randomuser.me/api/';
  const currentPage = `page=${pagination.currentPage}`;
  const pageSize = `results=${pagination.selectedSize}&`;
  const searchFor = `seed=${criteria}`;

  return `${URL}?${searchFor}&${pageSize}&${currentPage}`;
}
