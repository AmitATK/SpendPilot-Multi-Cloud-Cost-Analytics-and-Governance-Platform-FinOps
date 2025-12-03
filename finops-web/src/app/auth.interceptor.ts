import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../environments/environments';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
let url = req.url;
if (!/^https?:\/\//i.test(url)) {
const base = environment.apiBase.replace(/\/$/, '');
const path = url.startsWith('/') ? url : `/${url}`;
url = `${base}${path}`;
}
const token = localStorage.getItem('token');
const headers = token ? req.headers.set('Authorization', `Bearer ${token}`) : req.headers;
return next(req.clone({ url, headers }));
};