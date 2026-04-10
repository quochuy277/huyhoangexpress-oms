type DelayedQueryBootstrapOptions<T> = {
  currentQueryString: string;
  initialQueryString: string;
  initialData?: T | null;
  initialDataUpdatedAt?: number;
};

export function getDelayedQueryBootstrap<T>({
  currentQueryString,
  initialQueryString,
  initialData,
  initialDataUpdatedAt,
}: DelayedQueryBootstrapOptions<T>): {
  initialData: T | undefined;
  initialDataUpdatedAt: number | undefined;
} {
  if (initialData == null || currentQueryString !== initialQueryString) {
    return {
      initialData: undefined,
      initialDataUpdatedAt: undefined,
    };
  }

  return {
    initialData,
    initialDataUpdatedAt,
  };
}
