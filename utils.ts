
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const extractBase64Data = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

export const getMimeType = (dataUrl: string): string => {
  return dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const hexToColorName = (hex: string): string => {
  // Very basic approximation for prompting
  // In a real app, use a nearest-color library
  return `hex color ${hex}`;
};
