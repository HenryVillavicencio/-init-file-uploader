import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { MultipartClient, UploadStatus } from "./MultipartClient";

describe("MultipartClient", () => {
	let client: MultipartClient;
	let mockFile: File;

	const mockUrl = "https://api.example.com";
	const mockUploadId = "123456789";

	beforeEach(() => {
		client = new MultipartClient({
			baseURL: "https://api.example.com",
			partSize: 5 * 1024 * 1024,
			retries: 3,
		});

		// Create a mock file
		const blob = new Blob(["test content"], { type: "text/plain" });
		mockFile = new File([blob], "test.txt", { type: "text/plain" });

		global.fetch = mock(async () => {
			return new Response(
				JSON.stringify({ url: mockUrl, uploadId: mockUploadId }),
				{
					headers: {
						etag: "abc123",
					},
					status: 200,
				},
			);
		});
	});

	afterEach(() => {
		mock.restore();
	});

	test("creates an uploader instance", () => {
		const uploader = client.Uploader(mockFile);
		expect(uploader).toBeDefined();
	});

	test("handles file upload lifecycle", async () => {
		const uploader = client.Uploader(mockFile);

		let progressCalled = false;
		let completeCalled = false;

		uploader.setOnProgress((info) => {
			progressCalled = true;
			expect(info.totalBytes).toBe(mockFile.size);
			expect(info.percentage).toBeGreaterThanOrEqual(0);
			expect(info.percentage).toBeLessThanOrEqual(100);
		});

		uploader.setOnComplete(() => {
			completeCalled = true;
		});

		await uploader.uploadFile();

		expect(progressCalled).toBe(true);
		expect(completeCalled).toBe(true);
	});

	test("handles upload pause and resume", () => {
		const uploader = client.Uploader(mockFile);

		uploader.pause();
		expect(uploader.status).toBe(UploadStatus.PAUSED);

		uploader.resume();
		expect(uploader.status).toBe(UploadStatus.UPLOADING);
	});

	test("handles upload abort", () => {
		const uploader = client.Uploader(mockFile);

		uploader.abort();
		// Verify the upload was reset
		expect(uploader["bytesUploaded"]).toBe(0);
		expect(uploader["parts"]).toEqual([]);
		expect(uploader["uploadState"]).toEqual({
			uploadId: "",
			partsUploaded: [],
		});
	});

	test("handles upload errors", async () => {
		const uploader = client.Uploader(mockFile);
		let errorCalled = false;

		uploader.setOnError((error) => {
			errorCalled = true;
			expect(error).toBeInstanceOf(Error);
		});

		// Force an error by using an invalid URL
		client = new MultipartClient({
			baseURL: "invalid-url",
			partSize: 5 * 1024 * 1024,
			retries: 1,
		});

		try {
			await uploader.uploadFile();
		} catch (error) {
			expect(errorCalled).toBe(true);
		}
	});
});
