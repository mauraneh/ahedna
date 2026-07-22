import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventsListComponent } from './events-list.component';
import { AuthService } from '../../core/services/auth.service';
import { provideTranslocoTesting } from '../../testing/transloco-testing';

class AuthServiceStub {
  authenticated = true;

  isAuthenticated() {
    return this.authenticated;
  }

  currentUser() {
    return null;
  }

  hasRole() {
    return false;
  }

  logout() {}
}

function createComponent() {
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  TestBed.configureTestingModule({
    imports: [EventsListComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: queryParamMap$, snapshot: { firstChild: null, data: {} } },
      },
    ],
  });

  const fixture = TestBed.createComponent(EventsListComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  spyOn(router, 'navigate').and.resolveTo(true);

  return { fixture, httpMock, router, queryParamMap$ };
}

function selectEvent(queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>, id: string) {
  queryParamMap$.next(convertToParamMap({ id }));
}

describe('EventsListComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads upcoming events on init', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/events?type=upcoming`)
      .flush({ events: [{ id: 'evt-1' } as any] });

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.events.length).toBe(1);
  });

  it('requests navigation with the event id when a card is opened', () => {
    const { fixture, httpMock, router } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    fixture.componentInstance.openEvent({ id: 'evt-1' } as any);

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { id: 'evt-1' },
    }));
  });

  it('requires authentication before saving a participation', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/events?type=upcoming`)
      .flush({ events: [{ id: 'evt-1' } as any] });

    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.authenticated = false;
    selectEvent(queryParamMap$, 'evt-1');

    component.setParticipation('attending');

    expect(component.participationError).toBe('events.modal.loginRequired');
    httpMock.expectNone(() => true);
  });

  it('increments the participant count when moving from no participation to attending', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({
      events: [{ id: 'evt-1', participant_count: 4, current_user_participation: null } as any],
    });

    const component = fixture.componentInstance;
    selectEvent(queryParamMap$, 'evt-1');

    component.setParticipation('attending');

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1/participation`)
      .flush({ message: 'ok', participation: { status: 'attending' } });

    expect(component.selectedEvent?.participant_count).toBe(5);
    expect(component.selectedEvent?.current_user_participation).toBe('attending');
    expect(component.participationSaving).toBe(false);
    expect(component.participationMessage).toBe('events.modal.participationSaved');
  });

  it('decrements the participant count when moving from attending to declined', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({
      events: [{ id: 'evt-1', participant_count: 4, current_user_participation: 'attending' } as any],
    });

    const component = fixture.componentInstance;
    selectEvent(queryParamMap$, 'evt-1');

    component.setParticipation('declined');

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1/participation`)
      .flush({ message: 'ok', participation: { status: 'declined' } });

    expect(component.selectedEvent?.participant_count).toBe(3);
  });

  it('never lets the participant count go below zero', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({
      events: [{ id: 'evt-1', participant_count: 0, current_user_participation: 'attending' } as any],
    });

    const component = fixture.componentInstance;
    selectEvent(queryParamMap$, 'evt-1');

    component.setParticipation('declined');

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1/participation`)
      .flush({ message: 'ok', participation: { status: 'declined' } });

    expect(component.selectedEvent?.participant_count).toBe(0);
  });

  it('surfaces a participation error and stops the saving indicator', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({
      events: [{ id: 'evt-1', current_user_participation: null } as any],
    });

    const component = fixture.componentInstance;
    selectEvent(queryParamMap$, 'evt-1');
    component.setParticipation('attending');

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1/participation`)
      .flush({ error: 'Invalid participation status' }, { status: 400, statusText: 'Bad Request' });

    expect(component.participationError).toBe('events.modal.participationError');
    expect(component.participationSaving).toBe(false);
  });

  it('does not request navigation while a participation update is in flight', () => {
    const { fixture, httpMock, queryParamMap$, router } = createComponent();
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/events?type=upcoming`)
      .flush({ events: [{ id: 'evt-1' } as any] });

    const component = fixture.componentInstance;
    selectEvent(queryParamMap$, 'evt-1');
    component.participationSaving = true;
    (router.navigate as jasmine.Spy).calls.reset();

    component.closeEvent();

    expect(component.selectedEvent).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('fetches the event directly when it is not already in the loaded list', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    selectEvent(queryParamMap$, 'evt-42');

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-42`)
      .flush({ event: { id: 'evt-42', title: 'Sortie mémoire' } });

    expect(fixture.componentInstance.selectedEvent?.title).toBe('Sortie mémoire');
  });

  it('clears the selection and navigates back to the list when the requested event cannot be found', () => {
    const { fixture, httpMock, queryParamMap$, router } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    selectEvent(queryParamMap$, 'missing-id');

    httpMock
      .expectOne(`${environment.apiUrl}/events/missing-id`)
      .flush({ error: 'Event not found' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.selectedEvent).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { id: null },
    }));
  });

  it('formats a zero or missing price as free', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    const component = fixture.componentInstance;
    const transloco = (component as any).transloco;

    expect(component.formatPrice(0)).toBe(transloco.translate('events.modal.free'));
    expect(component.formatPrice(null)).toBe(transloco.translate('events.modal.free'));
  });

  it('formats a positive price as a currency amount', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    expect(fixture.componentInstance.formatPrice(12)).toContain('12');
  });

  it('never returns a negative participant count', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    expect(fixture.componentInstance.getParticipantCount({ participant_count: -3 } as any)).toBe(0);
    expect(fixture.componentInstance.getParticipantCount({ participant_count: '7' } as any)).toBe(7);
  });

  it('builds a Google Maps embed URL only when a location is provided', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    const component = fixture.componentInstance;
    expect(component.getMapEmbedUrl('  ')).toBeNull();
    expect(component.getMapEmbedUrl('Périgueux')).not.toBeNull();
    expect(component.getMapLink('Périgueux')).toContain(encodeURIComponent('Périgueux'));
  });
});
