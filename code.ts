/* eslint-disable */

function applyMatrixToPoint(matrix: number[][], point: number[]) {
  return [
    point[0] * matrix[0][0] + point[1] * matrix[0][1] + matrix[0][2],
    point[0] * matrix[1][0] + point[1] * matrix[1][1] + matrix[1][2]
  ]
}

function matrixInverse(matrix: number[][]) {
  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
  return [
    [matrix[1][1] / det, -matrix[0][1] / det, (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) / det],
    [-matrix[1][0] / det, matrix[0][0] / det, (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) / det]
  ]
}

function extractLinearGradientParamsFromTransform(
    shapeWidth: number,
    shapeHeight: number,
    t: Transform
) {
  const transform = t.length === 2 ? [...t, [0, 0, 1]] : [...t]
  const mxInv = matrixInverse(transform)
  const startEnd = [
    [0, 0.5],
    [1, 0.5]
  ].map((p) => applyMatrixToPoint(mxInv, p))
  return {
    start: [startEnd[0][0] * shapeWidth, startEnd[0][1] * shapeHeight],
    end: [startEnd[1][0] * shapeWidth, startEnd[1][1] * shapeHeight]
  }
}

function round(n: number, digits: number = 5) {
  return Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits);
}

function multiplyAlpha(color: { r: any; g: any; b: any; a: number }, opacity: number) {
    return {
        r: color.r,
        g: color.g,
        b: color.b,
        a: color.a * opacity
    };
}

figma.showUI(__html__, { width: 300, height: 700 });

figma.ui.onmessage = msg => {
  if (msg.type === 'copy-gradient') {
    const nodes = figma.currentPage.selection;
    // @ts-ignore
    if (nodes.length > 0 && nodes[0].fills && nodes[0].fills.length > 0) {
      // @ts-ignore
      const fill = nodes[0].fills.find(f => f.type === 'GRADIENT_LINEAR');
      if (fill && fill.type === 'GRADIENT_LINEAR' && fill.gradientTransform && fill.gradientTransform.length > 1) {
        const gradient = fill;
        const gradientTransform = gradient.gradientTransform;

        if (gradientTransform[0] && gradientTransform[1]) {
          const x1 = gradientTransform[0][2];
          const y1 = gradientTransform[1][2];
          const x2 = gradientTransform[0][0] + x1;
          const y2 = gradientTransform[1][0] + y1;

          const angleRadians = Math.atan2(y2 - y1, x2 - x1);
          const angleDegrees = angleRadians * (180 / Math.PI);

          const nodeBounds = nodes[0].absoluteBoundingBox;
          // @ts-ignore
          const nodeWidth = nodeBounds.width;
          // @ts-ignore
          const nodeHeight = nodeBounds.height;

          var params = extractLinearGradientParamsFromTransform(nodeWidth, nodeHeight, gradientTransform);

          const bounds = {
            x1: round(params.start[0] / nodeWidth),
            y1: round(params.start[1] / nodeHeight),
            x2: round(params.end[0] / nodeWidth),
            y2: round(params.end[1] / nodeHeight),
            width: round(1 / Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))),
            height: round(1)
          };

          const gradientData = {
            type: gradient.type,
            angle: round(angleDegrees),
            bounds: bounds,
          // @ts-ignore
            gradientStops: gradient.gradientStops.map(stop => ({
              color: multiplyAlpha(stop.color, gradient.opacity),
              position: round(stop.position)
            }))
          };
          figma.ui.postMessage({ type: 'gradient-data', gradientData });
        } else {
          figma.ui.postMessage({ type: 'error', message: 'Invalid gradient transform data.' });
        }
      } else {
        figma.ui.postMessage({ type: 'error', message: 'No linear gradient fill found on the selected node or transform data is missing.' });
      }
    } else {
      figma.ui.postMessage({ type: 'error', message: 'No selection or no fills found.' });
    }
  }
};
