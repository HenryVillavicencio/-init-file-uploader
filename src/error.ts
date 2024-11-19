export class UploadStartError extends Error {
	constructor() {
		super("Failed to start multipart upload");
	}
}

export class PresignedUrlError extends Error {
	constructor() {
		super("Failed to get presigned url");
	}
}

export class PartUploadError extends Error {
	constructor() {
		super("Failed to upload part");
	}
}

export class UploadCompleteError extends Error {
	constructor() {
		super("Failed to complete upload");
	}
}
