import React from "react";

interface RetryOptions {
	retries?: number;
	retryDelayMs?: number;
	isRetriableError?: (error: unknown) => boolean;
}

const defaultIsRetriable = (error: unknown): boolean => {
	const message = (error as { message?: string } | null)?.message || "";
	// Common transient errors for dynamic imports/chunks across browsers & bundlers
	return /ChunkLoadError|Loading chunk \d+ failed|Importing a module script failed|Failed to fetch dynamically imported module|network error/i.test(
		message
	);
};

export function lazyWithRetry<T extends React.ComponentType<unknown>>(
	factory: () => Promise<{ default: T }>,
	options: RetryOptions = {}
) {
	const {
		retries = 2,
		retryDelayMs = 500,
		isRetriableError = defaultIsRetriable,
	} = options;

	let attempt = 0;

	const load = (): Promise<{ default: T }> => {
		return factory().catch((error) => {
			if (attempt < retries && isRetriableError(error)) {
				attempt += 1;
				return new Promise<{ default: T }>((resolve) => {
					setTimeout(() => {
						resolve(load());
					}, retryDelayMs);
				});
			}
			throw error;
		});
	};

	return React.lazy(load);
}


