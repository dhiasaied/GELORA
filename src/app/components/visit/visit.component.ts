import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../core/theme/theme.service';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SplitTextDirective } from '../../shared/directives/split-text.directive';

/** Visit + pre-order. The order is handled client-side (no backend in this project). */
@Component({
  selector: 'gelora-visit',
  imports: [ReactiveFormsModule, RevealDirective, SplitTextDirective, MagneticDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visit.component.html',
  styleUrl: './visit.component.scss',
})
export class VisitComponent {
  readonly theme = inject(ThemeService);
  readonly sent = signal<string | null>(null);

  readonly hours = [
    ['Mon – Thu', '11:00 – 22:00'],
    ['Fri – Sat', '11:00 – 00:00'],
    ['Sunday', '12:00 – 22:00'],
  ];

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    flavor: [this.theme.palette().id === 'custom' ? 'pistachio' : this.theme.palette().id],
    scoops: [2],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, flavor, scoops } = this.form.getRawValue();
    const label = this.theme.palettes.find((p) => p.id === flavor)?.flavor ?? flavor;
    this.sent.set(`Grazie, ${name.split(' ')[0]}! ${scoops} scoop${scoops > 1 ? 's' : ''} of ${label} will be waiting for you.`);
    this.form.reset({ name: '', email: '', flavor, scoops });
  }

  invalid(name: 'name' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}
