import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactComponent } from './contact.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

function createComponent() {
  TestBed.configureTestingModule({
    imports: [ContactComponent],
    providers: [
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: NoopAuthServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(ContactComponent);
  fixture.detectChanges();
  return fixture;
}

describe('ContactComponent', () => {
  it('marks every field as touched and does not submit when the form is invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const buildMailtoSpy = spyOn(component, 'buildMailtoUrl').and.callThrough();

    component.submitContact();

    expect(component.submitted).toBe(true);
    expect(component.contactForm.get('name')?.touched).toBe(true);
    expect(buildMailtoSpy).not.toHaveBeenCalled();
  });

  it('rejects a message shorter than 10 characters', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.contactForm.setValue({
      name: 'Jean Dupont',
      email: 'jean@example.org',
      subject: 'Une question',
      message: 'trop cour',
    });

    expect(component.contactForm.valid).toBe(false);
  });

  it('builds a mailto link with the encoded subject and message', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const mailtoUrl = component.buildMailtoUrl({
      name: 'Jean Dupont',
      email: 'jean@example.org',
      subject: 'Une question importante',
      message: 'Ceci est un message suffisamment long pour être valide.',
    });

    expect(mailtoUrl).toContain('mailto:ahedna.nouvelleaquitaine@gmail.com');
    expect(mailtoUrl).toContain(encodeURIComponent('[Contact AHEDNA] Une question importante'));
    expect(mailtoUrl).toContain(encodeURIComponent('Nom : Jean Dupont'));
  });

  // Note: submitContact() assigns window.location.href to trigger a mailto: link once the
  // form is valid. Actually invoking that assignment triggers a real navigation attempt even
  // for non-http schemes and crashes the headless test runner ("full page reload"), so the
  // valid-submission path is covered by testing buildMailtoUrl() in isolation above, and
  // manually via the recette (cahier de recettes, scénario transverse contact).
});
