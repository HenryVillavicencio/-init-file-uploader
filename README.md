# MultipartClient Upload Library

A **powerful** and **flexible** library designed to handle large file uploads with features like pause/resume functionality, progress tracking, and configurable retries.

## 📋 Features

- **Multipart File Upload**: Break files into smaller parts for efficient upload.
- **Pause/Resume Support**: Start, stop, and continue uploads without losing progress.
- **Real-Time Progress Tracking**: Monitor upload percentage, speed, and estimated time remaining.
- **Configurable Retry Mechanism**: Handle temporary failures with automatic retries.
- **Upload Speed Metrics**: Provides insights into current upload speed and efficiency.

---

## 🚀 Installation

To install the library, use **bun** (or adapt for npm/yarn as needed):

```bash
bun add @init/file-uploader
```

---

## 🛠️ Basic Usage

Here’s an example of how to use the library for uploading files:

```typescript
import { MultipartClient } from '@init/file-uploader';

// Initialize the client with configuration options
const client = new MultipartClient({
  baseURL: 'https://your-api.com/upload', // Replace with your upload endpoint
  partSize: 5 * 1024 * 1024, // 5MB chunks
  retries: 3, // Number of retry attempts
});

// Create an uploader instance for your file
const uploader = client.Uploader(file);

// Add event listeners for better user feedback
uploader.setOnProgress((progress) => {
  console.log(`Upload Progress: ${progress.percentage.toFixed(2)}%`);
  console.log(`Upload Speed: ${(progress.speed / 1024).toFixed(2)} KB/s`);
  console.log(`Remaining Time: ${progress.remainingTime.toFixed(2)} seconds`);
});

uploader.setOnComplete(() => {
  console.log('✅ Upload completed successfully!');
});

uploader.setOnError((error) => {
  console.error('❌ Upload failed:', error.message);
});

// Start the upload
await uploader.uploadFile();
```

---

## 🎮 Control Methods

Use these methods to control your uploads programmatically:

```typescript
// Pause the ongoing upload
uploader.pause();

// Resume a paused upload
uploader.resume();

// Abort and cancel the upload
uploader.abort();
```

---

## ⚙️ Configuration Options

Below is a detailed breakdown of the configuration options:

```typescript
interface MultipartConfig {
  baseURL: string;       // (Required) API endpoint for the file upload
  partSize?: number;     // Size of each chunk in bytes (default: 5MB)
  retries?: number;      // Number of retry attempts for failed uploads (default: 3)
  delay?: number;        // Delay (in ms) between retry attempts (default: 0)
}
```

### Example Configuration:

```typescript
const config: MultipartConfig = {
  baseURL: 'https://your-api.com/upload',
  partSize: 10 * 1024 * 1024, // Use 10MB chunks
  retries: 5, // Allow up to 5 retries
  delay: 2000, // Wait 2 seconds between retries
};
```

---

## 📖 Best Practices

1. **Chunk Size Optimization**: Adjust `partSize` based on the network environment. Smaller chunks are ideal for unstable networks, while larger chunks maximize throughput in stable environments.
2. **Error Handling**: Use `setOnError` to gracefully handle upload errors and notify users.
3. **Concurrency** (Future Feature): Consider splitting uploads into multiple concurrent streams for faster uploads.

---

## 📢 Notes

- This library is designed for **modern JavaScript/TypeScript environments**. Ensure your runtime supports `Promises` and `Fetch`.
- Integrate with your backend using a compatible API endpoint that supports **multipart uploads**.

---

## 🧩 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request on GitHub.

---

Esta versión tiene secciones más uniformes, incluye notas prácticas y fomenta una experiencia de usuario más fluida. Además, utiliza un tono más profesional y motivador.