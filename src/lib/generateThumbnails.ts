/**
 * Genera una serie de miniaturas en base64 de manera asíncrona para un archivo de video.
 * Utiliza un elemento de video temporal en background para hacer seek y capturar fotogramas con canvas.
 */
export function generateThumbnails(
  videoUrl: string,
  duration: number,
  count: number = 10
): Promise<string[]> {
  return new Promise((resolve) => {
    if (!videoUrl || duration <= 0) {
      resolve([]);
      return;
    }

    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const thumbnails: string[] = [];
    let currentIndex = 0;

    const captureNext = () => {
      if (currentIndex >= count) {
        // Finalizado, limpiar y resolver
        video.src = '';
        video.load();
        resolve(thumbnails);
        return;
      }

      // Calcular tiempo equidistante
      // Asegurar que no sea exactamente el final para evitar problemas en algunos codecs
      const time = Math.min(duration * (currentIndex / (count - 1 || 1)), duration - 0.05);

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);

        if (ctx) {
          // Ajustar tamaño del canvas manteniendo el aspect ratio original del video
          const videoWidth = video.videoWidth || 160;
          const videoHeight = video.videoHeight || 90;
          const targetWidth = 120;
          const targetHeight = Math.round((videoHeight / videoWidth) * targetWidth);

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Dibujar fotograma
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // calidad baja-media para ahorrar memoria
            thumbnails.push(dataUrl);
          } catch (e) {
            console.error('Error al serializar fotograma de preview:', e);
          }
        }

        currentIndex++;
        // Programar captura del siguiente fotograma
        setTimeout(captureNext, 10);
      };

      const onError = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        // Continuar si hay un fallo en un frame específico
        currentIndex++;
        setTimeout(captureNext, 10);
      };

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = time;
    };

    video.addEventListener('loadedmetadata', () => {
      // Iniciar secuencia de captura
      captureNext();
    }, { once: true });

    video.addEventListener('error', () => {
      resolve([]);
    }, { once: true });

    // Cargar video
    video.load();
  });
}
