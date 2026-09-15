import { removeBackground, Config } from '@imgly/background-removal';

export async function removeImageBackground(
  imageSource: string | Blob | File,
  onProgress?: (fraction: number, key?: string) => void,
): Promise<Blob> {
  const config: Config = {
    progress: (key: string, current: number, total: number) => {
      if (total > 0 && onProgress) {
        onProgress(current / total, key);
      }
    },
  };

  const blob = await removeBackground(imageSource, config);
  return blob;
}
