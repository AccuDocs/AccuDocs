import sharp from 'sharp';

export const preprocessImage = async (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer)
    .rotate()
    .greyscale()
    .normalize()
    .sharpen()
    .threshold(150)
    .jpeg({ quality: 100, mozjpeg: true })
    .toBuffer();
};
