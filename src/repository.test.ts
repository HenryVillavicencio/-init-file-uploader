import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
	startUpload,
	getPresignedUrl,
	uploadPart,
	completeUpload,
} from "./repository";
import {
	UploadStartError,
	PresignedUrlError,
	PartUploadError,
	UploadCompleteError,
} from "./error";

describe("File Upload Repository", () => {
	const mockUrl = "https://api.example.com";
	const mockFileName = "test-file.pdf";
	const mockUploadId = "123456789";

	beforeEach(() => {
		// Reset all mocks before each test
		mock.restore();
	});

	describe("startUpload", () => {
		test("successfully starts upload", async () => {
			global.fetch = mock(async () => {
				return new Response(JSON.stringify({ uploadId: mockUploadId }), {
					status: 200,
				});
			});

			const result = await startUpload({
				url: mockUrl,
				fileName: mockFileName,
			});

			expect(result.uploadId).toBe(mockUploadId);
		});

		test("throws MultipartUploadStartError on failure", async () => {
			global.fetch = mock(async () => {
				return new Response(null, { status: 400 });
			});

			expect(
				startUpload({
					url: mockUrl,
					fileName: mockFileName,
				}),
			).rejects.toThrow(UploadStartError);
		});
	});

	describe("getPresignedUrl", () => {
		test("successfully gets presigned URL", async () => {
			const mockPresignedUrl = "https://presigned.example.com";
			global.fetch = mock(async () => {
				return new Response(JSON.stringify({ url: mockPresignedUrl }), {
					status: 200,
				});
			});

			const result = await getPresignedUrl({
				url: mockUrl,
				fileName: mockFileName,
				uploadId: mockUploadId,
				partNumber: 1,
			});

			expect(result.url).toBe(mockPresignedUrl);
		});

		test("throws PresignedUrlError on failure", async () => {
			global.fetch = mock(async () => {
				return new Response(null, { status: 400 });
			});

			expect(
				getPresignedUrl({
					url: mockUrl,
					fileName: mockFileName,
					uploadId: mockUploadId,
					partNumber: 1,
				}),
			).rejects.toThrow(PresignedUrlError);
		});
	});

	describe("uploadPart", () => {
		test("successfully uploads part", async () => {
			const mockETag = "abc123";
			global.fetch = mock(async () => {
				return new Response(null, {
					status: 200,
					headers: { etag: `"${mockETag}"` },
				});
			});

			const result = await uploadPart({
				url: mockUrl,
				partData: new Blob(["test data"]),
			});

			expect(result.ETag).toBe(mockETag);
		});

		test("throws PartUploadError on failure", async () => {
			global.fetch = mock(async () => {
				return new Response(null, { status: 400 });
			});

			expect(
				uploadPart({
					url: mockUrl,
					partData: new Blob(["test data"]),
				}),
			).rejects.toThrow(PartUploadError);
		});
	});

	describe("completeUpload", () => {
		test("successfully completes multipart upload", async () => {
			const mockResponse = { status: "success" };
			global.fetch = mock(async () => {
				return new Response(JSON.stringify(mockResponse), {
					status: 200,
				});
			});

			const result = await completeUpload({
				url: mockUrl,
				fileName: mockFileName,
				uploadId: mockUploadId,
				parts: [
					{ PartNumber: 1, ETag: "etag1" },
					{ PartNumber: 2, ETag: "etag2" },
				],
			});

			expect(result).toEqual(mockResponse);
		});

		test("throws UploadCompleteError on failure", async () => {
			global.fetch = mock(async () => {
				return new Response(null, { status: 400 });
			});

			expect(
				completeUpload({
					url: mockUrl,
					fileName: mockFileName,
					uploadId: mockUploadId,
					parts: [
						{ PartNumber: 1, ETag: "etag1" },
						{ PartNumber: 2, ETag: "etag2" },
					],
				}),
			).rejects.toThrow(UploadCompleteError);
		});
	});
});
