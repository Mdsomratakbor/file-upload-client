import { Component } from '@angular/core';
import { FileUploadService } from '../services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: false
})
export class FileUploadComponent {
  selectedFile: File | null = null;
  progress: number = 0;
  uploadMessage: string = '';

  constructor(private fileUploadService: FileUploadService) {}

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    this.progress = 0;  // Reset progress on file selection
    this.uploadMessage = '';
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      this.uploadMessage = 'Please select a file first.';
      return;
    }
  
    this.uploadMessage = 'Starting file upload...';
    this.uploadFileInChunks();
  }
  
  uploadFileInChunks(): void {
    if (!this.selectedFile) return;

    this.fileUploadService.uploadFileInChunks(this.selectedFile).subscribe({
      next: (response: any) => {
        this.uploadMessage = response.message;
      },
      error: (error) => {
        this.uploadMessage = 'Upload failed';
        console.error(error);
      },
      complete: () => {
        this.uploadMessage = 'Upload completed successfully';
      }
    });

    // Track upload progress
    this.fileUploadService.uploadProgress$.subscribe(progress => {
      this.progress = progress;
    });
  }
}
