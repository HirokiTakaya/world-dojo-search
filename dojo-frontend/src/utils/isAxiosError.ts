// src/utils/isAxiosError.ts
// src/utils/isAxiosError.ts

/**
 * axios のバージョンによっては isAxiosError が存在しないので、
 * 自前でユーザー定義型ガードを作る。
 */
// src/utils/isAxiosError.ts

/**
 * axios のバージョンによっては isAxiosError が存在しないので、
 * 自前でユーザー定義型ガードを作る。
 */
export function isAxiosError(error: unknown): error is {
  response?: any;
  request?: any;
  isAxiosError: boolean;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}
