import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class HttpErrorToastInterceptor implements HttpInterceptor {
  private snack = inject(MatSnackBar);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const msg = err?.error?.message || err.statusText || 'Request failed';
        this.snack.open(msg, 'Dismiss', { duration: 3000 });
        return throwError(() => err);
      })
    );
  }
}
