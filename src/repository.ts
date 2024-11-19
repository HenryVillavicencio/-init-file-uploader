import {
	UploadStartError,
	PartUploadError,
	PresignedUrlError,
	UploadCompleteError,
} from "./error";

interface StartUploadParams {
	url: string;
	fileName: string;
}

export const startUpload = async (
	params: StartUploadParams,
): Promise<{ uploadId: string }> => {
	const response = await fetch(`${params.url}/start-multipart-upload`, {
		method: "POST",
		body: JSON.stringify({ fileName: params.fileName }),
	});
	if (!response.ok) {
		throw new UploadStartError();
	}
	return response.json();
};

interface GetPresignedUrlParams {
	url: string;
	fileName: string;
	uploadId: string;
	partNumber: number;
}

export const getPresignedUrl = async (
	params: GetPresignedUrlParams,
): Promise<{ url: string }> => {
	const response = await fetch(
		`${params.url}/generate-presigned-url?fileName=${encodeURIComponent(
			params.fileName,
		)}&uploadId=${params.uploadId}&partNumber=${params.partNumber}`,
	);

	if (!response.ok) {
		throw new PresignedUrlError();
	}

	return response.json();
};

interface UploadPartParams {
	url: string;
	partData: Blob;
}

export const uploadPart = async (
	params: UploadPartParams,
): Promise<{ ETag: string }> => {
	const response = await fetch(params.url, {
		method: "PUT",
		body: params.partData,
	});
	if (!response.ok) {
		throw new PartUploadError();
	}
	const ETag = response.headers.get("etag")!.replaceAll('"', "");

	return { ETag };
};

interface CompleteUploadParams {
	url: string;
	fileName: string;
	uploadId: string;
	parts: { PartNumber: number; ETag: string }[];
}
export const completeUpload = async (
	params: CompleteUploadParams,
): Promise<any> => {
	const response = await fetch(`${params.url}/complete-multipart-upload`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			fileName: params.fileName,
			uploadId: params.uploadId,
			parts: params.parts,
		}),
	});
	if (!response.ok) {
		throw new UploadCompleteError();
	}
	return response.json();
};
