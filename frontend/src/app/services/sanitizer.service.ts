import { Injectable } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class SanitizerService {
  /**
   * Limpia y sanitiza cadenas de texto ingresadas por el usuario eliminando etiquetas HTML y scripts maliciosos (OWASP XSS mitigation).
   */
  sanitizarTexto(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:[^"]*/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
  }

  /**
   * Recorre recursivamente un objeto o formulario (FormGroup, FormArray o valor plano)
   * y sanitiza todas sus propiedades de tipo string contra XSS.
   */
  sanitizarFormulario<T>(formData: T): T {
    if (formData === null || formData === undefined) {
      return formData;
    }

    if (formData instanceof FormGroup) {
      Object.keys(formData.controls).forEach((key) => {
        const control = formData.get(key);
        if (control instanceof FormControl && typeof control.value === 'string') {
          control.setValue(this.sanitizarTexto(control.value), { emitEvent: false });
        } else if (control instanceof FormGroup || control instanceof FormArray) {
          this.sanitizarFormulario(control);
        }
      });
      return formData.value as T;
    }

    if (typeof formData === 'string') {
      return this.sanitizarTexto(formData) as unknown as T;
    }

    if (typeof formData === 'object') {
      const sanitizedObj: any = Array.isArray(formData) ? [] : {};
      for (const [key, value] of Object.entries(formData)) {
        if (typeof value === 'string') {
          sanitizedObj[key] = this.sanitizarTexto(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitizedObj[key] = this.sanitizarFormulario(value);
        } else {
          sanitizedObj[key] = value;
        }
      }
      return sanitizedObj as T;
    }

    return formData;
  }
}
