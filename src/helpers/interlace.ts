/**
 * @since 2019-12-31 02:27
 * @author vivaxy
 */
const ADAM7_PASSES = [
  {
    x: [0],
    y: [0],
  },
  {
    x: [4],
    y: [0],
  },
  {
    x: [0, 4],
    y: [4],
  },
  {
    x: [2, 6],
    y: [0, 4],
  },
  {
    x: [0, 2, 4, 6],
    y: [2, 6],
  },
  {
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6],
  },
  {
    x: [0, 1, 2, 3, 4, 5, 6, 7],
    y: [1, 3, 5, 7],
  },
];

type Image = {
  passWidth: number;
  passHeight: number;
  passIndex: number;
};

export function buildImages(
  interlace: number,
  width: number,
  height: number,
): Image[] {
  if (!interlace) {
    return [
      {
        passWidth: width,
        passHeight: height,
        passIndex: 0,
      },
    ];
  }
  const images: Image[] = [];
  ADAM7_PASSES.forEach(function({ x, y }, passIndex) {
    const remainingX = width % 8;
    const remainingY = height % 8;
    const repeatX = (width - remainingX) >> 3;
    const repeatY = (height - remainingY) >> 3;
    let passWidth = repeatX * x.length;
    for (let i = 0; i < x.length; i++) {
      if (x[i] < remainingX) {
        passWidth++;
      } else {
        break;
      }
    }
    let passHeight = repeatY * y.length;
    for (let i = 0; i < y.length; i++) {
      if (y[i] < remainingY) {
        passHeight++;
      } else {
        break;
      }
    }
    if (passWidth && passHeight) {
      images.push({
        passWidth: passWidth,
        passHeight: passHeight,
        passIndex: passIndex,
      });
    }
  });
  return images;
}

export function getPixelIndex(
  interlace: number,
  width: number,
  passIndex: number,
  widthIndex: number,
  heightIndex: number,
): number {
  if (!interlace) {
    return (width * heightIndex + widthIndex) << 2;
  }
  const pass = ADAM7_PASSES[passIndex];
  const remainingX = widthIndex % pass.x.length;
  const remainingY = heightIndex % pass.y.length;
  const repeatX = (widthIndex - remainingX) / pass.x.length;
  const repeatY = (heightIndex - remainingY) / pass.y.length;
  const offsetX = pass.x[remainingX];
  const offsetY = pass.y[remainingY];
  return (width * ((repeatY << 3) + offsetY) + (repeatX << 3) + offsetX) << 2;
}
