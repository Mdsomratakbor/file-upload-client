import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, forkJoin } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  private apiUrl = 'https://localhost:7037/api/Upload/upload-chunk';  // Replace with your actual API URL
  private progressSubject = new Subject<number>();  // Subject to emit progress updates
  public uploadProgress$ = this.progressSubject.asObservable(); // Observable to be used by components

  constructor(private http: HttpClient) {}

  uploadFileInChunks(file: File): Observable<any> {
    const chunkSize = 1024 * 1024 * 5; // 5 MB per chunk
    const totalChunks = Math.ceil(file.size / chunkSize);

    let currentChunk = 0;
    const fileId = this.generateUniqueId();
    const fileName = file.name;

    // Observable that handles each chunk upload
    const uploadChunk = (chunkStart: number, chunkEnd: number, chunkIndex: number): Observable<any> => {
      const chunkBlob = file.slice(chunkStart, chunkEnd);
      const formData = new FormData();
      formData.append('chunk', chunkBlob);
      formData.append('fileName', fileName);
      formData.append('fileId', fileId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());

      return this.http.post(this.apiUrl, formData, {
        headers: new HttpHeaders(),
        observe: 'events',
        reportProgress: true
      }).pipe(
        tap(event => this.handleProgress(event, chunkIndex, totalChunks)),
        catchError((error) => {
          this.progressSubject.error(error); // Emit error to progress observable
          throw error;
        })
      );
    };

    // Observable to process all chunks
    const uploadChunks = () => {
      let chunkObservables: Observable<any>[] = [];
      while (currentChunk < totalChunks) {
        const chunkStart = currentChunk * chunkSize;
        const chunkEnd = Math.min(chunkStart + chunkSize, file.size);
        chunkObservables.push(uploadChunk(chunkStart, chunkEnd, currentChunk));
        currentChunk++;
      }

      return forkJoin(chunkObservables); // Use forkJoin directly
    };

    // Return observable with progress updates
    return new Observable(observer => {
      uploadChunks().subscribe({
        next: (response: any) => {
          this.progressSubject.next(100); // Once upload is complete, set progress to 100%
          observer.next({ message: 'File upload complete' });
          observer.complete();
        },
        error: (error: any) => {
          this.progressSubject.error(error); // Emit error if something goes wrong
          observer.error(error);
        }
      });
    });
  }

  private handleProgress(event: any, chunkIndex: number, totalChunks: number): void {
    if (event.type === HttpEventType.UploadProgress && event.total) {
      const chunkProgress = Math.round((100 * event.loaded) / event.total);
      const overallProgress = Math.round(((chunkIndex + chunkProgress / 100) / totalChunks) * 100);
      this.progressSubject.next(overallProgress); // Emit progress to subject
    }
  }

  private generateUniqueId(): string {
    return (Math.random() + 1).toString(36).substring(7);  // Simple unique ID generator
  }
}
