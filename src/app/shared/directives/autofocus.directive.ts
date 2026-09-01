import {
  AfterViewInit,
  Directive,
  ElementRef,
  booleanAttribute,
  inject,
  input,
} from '@angular/core';

/**
 * Moves keyboard focus to the host element when it is rendered.
 * Use `appAutofocus` plainly, or `[appAutofocus]="condition"` to focus
 * conditionally (useful when a container renders multiple candidates).
 */
@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective implements AfterViewInit {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly appAutofocus = input(true, { transform: booleanAttribute });

  ngAfterViewInit(): void {
    if (!this.appAutofocus()) {
      return;
    }

    // Defer so dynamically-rendered elements (e.g. dialogs) are focusable.
    setTimeout(() => this.elementRef.nativeElement.focus());
  }
}
