import {
	completeUpload,
	getPresignedUrl,
	startUpload,
	uploadPart,
} from "./repository";
import { retry } from "./retry";

interface MultipartConfig {
	partSize?: number;
	retries?: number;
	baseURL: string;
	delay?: number;
}

interface UploadState {
	uploadId: string;
	partsUploaded: number[];
}

interface UploadPart {
	ETag: string;
	PartNumber: number;
}

interface ProgressInfo {
	percentage: number;
	uploadedBytes: number;
	totalBytes: number;
	speed: number;
	remainingTime: number;
}

export enum UploadStatus {
	IDLE = "IDLE",
	UPLOADING = "UPLOADING",
	PAUSED = "PAUSED",
	COMPLETED = "COMPLETED",
	ERROR = "ERROR",
}

export class MultipartClient {
	constructor(private config: MultipartConfig) {}

	Uploader(file: File) {
		return new MultipartUploader(file, this.config);
	}
}

class MultipartUploader {
	private url: string;
	private retries: number;
	private PART_SIZE: number;
	public status: UploadStatus = UploadStatus.IDLE;
	private abortController: AbortController = new AbortController();
	private uploadStartTime?: number;
	private lastUploadedBytes: number = 0;

	private uploadState: UploadState = {
		uploadId: "",
		partsUploaded: [],
	};

	private parts: UploadPart[] = [];
	private bytesUploaded: number = 0;
	private onProgress?: (info: ProgressInfo) => void;
	private onComplete?: () => void;
	private onError?: (error: Error) => void;

	constructor(
		private file: File,
		config: MultipartConfig,
	) {
		this.url = config.baseURL;
		this.PART_SIZE = config.partSize || 5 * 1024 * 1024;
		this.retries = config.retries || 3;
	}

	setOnProgress(onProgress: (info: ProgressInfo) => void) {
		this.onProgress = onProgress;
	}

	setOnComplete(onComplete: () => void) {
		this.onComplete = onComplete;
	}

	setOnError(onError: (error: Error) => void) {
		this.onError = onError;
	}

	private _useRetry<T>(operation: () => Promise<T>) {
		return retry({
			operation,
			retries: this.retries,
			onError: this.onError,
		});
	}

	private validateFile() {
		if (!this.file) {
			throw new Error("No file provided");
		}
		if (this.file.size === 0) {
			throw new Error("File is empty");
		}
	}

	private calculateSpeed(): number {
		const now = Date.now();
		const timeDiff = (now - (this.uploadStartTime || now)) / 1000;
		const speed = (this.bytesUploaded - this.lastUploadedBytes) / timeDiff;
		this.lastUploadedBytes = this.bytesUploaded;
		return speed;
	}

	private updateProgress() {
		if (this.onProgress) {
			const speed = this.calculateSpeed();
			const remainingBytes = this.file.size - this.bytesUploaded;
			const remainingTime = speed > 0 ? remainingBytes / speed : 0;

			const progressInfo: ProgressInfo = {
				percentage: Math.round((this.bytesUploaded / this.file.size) * 100),
				uploadedBytes: this.bytesUploaded,
				totalBytes: this.file.size,
				speed,
				remainingTime,
			};

			this.onProgress(progressInfo);
		}
	}

	private reset() {
		this.bytesUploaded = 0;
		this.parts = [];
		this.uploadState = { uploadId: "", partsUploaded: [] };
		this.status = UploadStatus.IDLE;
	}

	abort() {
		this.abortController.abort();
		this.reset();
	}

	pause() {
		if (this.status === UploadStatus.PAUSED) {
			console.log(`Upload for ${this.file.name} is already paused.`);
			return;
		}
		this.status = UploadStatus.PAUSED;
		console.log(`Upload for ${this.file.name} has been paused.`);
	}

	resume() {
		if (this.status !== UploadStatus.PAUSED) {
			console.log(`Upload for ${this.file.name} is not paused.`);
			return;
		}
		this.status = UploadStatus.UPLOADING;
		console.log(`Resuming upload for ${this.file.name}...`);
		this.uploadFile();
	}

	private _startUpload() {
		return this._useRetry(() =>
			startUpload({
				url: this.url,
				fileName: this.file.name,
			}),
		);
	}

	private _getPresignedUrl(partNumber: number) {
		return this._useRetry(() =>
			getPresignedUrl({
				url: this.url,
				fileName: this.file.name,
				uploadId: this.uploadState.uploadId,
				partNumber: partNumber,
			}),
		);
	}

	private async _uploadPart(url: string, partData: Blob) {
		return this._useRetry(() =>
			uploadPart({
				url,
				partData,
			}),
		);
	}

	private async _completeUpload() {
		const parts = this.parts.sort((a, b) => a.PartNumber - b.PartNumber);
		return this._useRetry(() =>
			completeUpload({
				url: this.url,
				fileName: this.file.name,
				uploadId: this.uploadState.uploadId,
				parts,
			}),
		);
	}

	async uploadFile() {
		try {
			this.validateFile();
			this.status = UploadStatus.UPLOADING;
			this.uploadStartTime = Date.now();

			let partNumber = 0;

			if (!this.uploadState.uploadId) {
				const { uploadId } = await this._startUpload();
				this.uploadState.uploadId = uploadId;
			}

			for (let start = 0; start < this.file.size; start += this.PART_SIZE) {
				// @ts-ignore
				if (this.status === UploadStatus.PAUSED) {
					console.log(`Upload for ${this.file.name} is paused.`);
					break;
				}
				partNumber++;
				if (!this.uploadState.partsUploaded.includes(partNumber)) {
					const partData = this.file.slice(start, start + this.PART_SIZE);
					const { url } = await this._getPresignedUrl(partNumber);
					const { ETag } = await this._uploadPart(url, partData);
					this.bytesUploaded += partData.size;
					this.updateProgress();
					this.parts.push({ ETag, PartNumber: partNumber });
					this.uploadState.partsUploaded.push(partNumber);
				}
			}

			if (this.status === UploadStatus.UPLOADING) {
				const completionConfirmation = await this._completeUpload();
				this.status = UploadStatus.COMPLETED;
				if (this.onComplete) {
					this.onComplete();
				}
				console.log(
					`Upload for ${this.file.name} completed:`,
					completionConfirmation,
				);
			}
		} catch (error) {
			this.status = UploadStatus.ERROR;
			if (this.onError) {
				this.onError(error as Error);
			}
			throw error;
		}
	}
}
