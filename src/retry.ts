interface Params<T> {
	operation: () => Promise<T>;
	retries: number;
	onError?: (error: Error) => void;
	attempt?: number;
	delay?: number;
}
export async function retry<T>(params: Params<T>): Promise<T> {
	const { operation, retries, onError, attempt = 1, delay = 1000 } = params;
	try {
		return await operation();
	} catch (error) {
		if (attempt >= retries) {
			if (onError) {
				onError(error as Error);
			}
			throw error;
		}
		await new Promise((resolve) => setTimeout(resolve, delay * attempt));
		return retry({
			...params,
			attempt: attempt + 1,
		});
	}
}
