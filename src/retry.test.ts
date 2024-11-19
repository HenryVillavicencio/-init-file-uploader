import { expect, test, mock, describe } from "bun:test";
import { retry } from "./retry";

describe("retry", () => {
	test("should resolve on first attempt", async () => {
		const operation = () => Promise.resolve("success");
		const result = await retry({
			operation,
			retries: 3,
			onError: () => {},
		});
		expect(result).toBe("success");
	});

	test("should retry on failure and succeed", async () => {
		let attempts = 0;
		const operation = () => {
			if (attempts++ < 1) {
				return Promise.reject(new Error("temporary error"));
			}
			return Promise.resolve("success after retry");
		};

		const result = await retry({
			operation,
			retries: 3,
			onError: () => {},
			delay: 100,
		});

		expect(result).toBe("success after retry");
		expect(attempts).toBe(2);
	});

	test("should fail after max retries", async () => {
		const operation = () => Promise.reject(new Error("persistent error"));
		const onError = mock(() => {});

		try {
			await retry({
				operation,
				retries: 2,
				onError,
				delay: 100,
			});
		} catch (error) {
			expect((error as Error).message).toBe("persistent error");
			expect(onError).toHaveBeenCalled();
		}
	});

	test("should respect delay between retries", async () => {
		const startTime = Date.now();
		let attempts = 0;

		const operation = () => {
			if (attempts++ < 1) {
				return Promise.reject(new Error("temporary error"));
			}
			return Promise.resolve("success");
		};

		await retry({
			operation,
			retries: 3,
			onError: () => {},
			delay: 100,
		});

		const duration = Date.now() - startTime;
		expect(duration).toBeGreaterThan(90); // Account for small timing variations
	});
});
