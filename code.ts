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

function extractLinearGradientParamsFromTransform(shapeWidth: number, shapeHeight: number, t: Transform) {
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

function extractRadialGradientParamsFromTransform(shapeWidth: number, shapeHeight: number, t: Transform) {
    const transform = t.length === 2 ? [...t, [0, 0, 1]] : [...t]
    const mxInv = matrixInverse(transform)
    const center = applyMatrixToPoint(mxInv, [0.5, 0.5])
    const radius = Math.sqrt(transform[0][0] * transform[0][0] + transform[1][0] * transform[1][0])
    return {
        center: [center[0] * shapeWidth, center[1] * shapeHeight],
        radius: 0.5 / radius
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

function getGradientData() {
    let gradientData = null;
    let params = null;

    const nodes = figma.currentPage.selection;
    // @ts-ignore
    if (nodes.length > 0 && nodes[0].fills && nodes[0].fills.length > 0) {
        // @ts-ignore
        const fill = nodes[0].fills.find(f => f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL');
        if (fill && (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') && fill.gradientTransform && fill.gradientTransform.length > 1) {
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

                if (fill.type === 'GRADIENT_LINEAR') {
                    params = extractLinearGradientParamsFromTransform(nodeWidth, nodeHeight, gradientTransform);

                    const bounds = {
                        x1: round(params.start[0] / nodeWidth),
                        y1: round(params.start[1] / nodeHeight),
                        x2: round(params.end[0] / nodeWidth),
                        y2: round(params.end[1] / nodeHeight),
                        width: round(1 / Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))),
                        height: round(1)
                    };

                    gradientData = {
                        type: gradient.type,
                        angle: round(angleDegrees),
                        bounds: bounds,
                        // @ts-ignore
                        gradientStops: gradient.gradientStops.map(stop => ({
                            color: multiplyAlpha(stop.color, gradient.opacity),
                            position: round(stop.position)
                        }))
                    };
                } else if (fill.type === 'GRADIENT_RADIAL') {
                    params = extractRadialGradientParamsFromTransform(nodeWidth, nodeHeight, gradientTransform);

                    gradientData = {
                        type: gradient.type,
                        center: {
                            x: round(params.center[0] / nodeWidth),
                            y: round(params.center[1] / nodeHeight)
                        },
                        radius: round(params.radius),
                        // @ts-ignore
                        gradientStops: gradient.gradientStops.map(stop => ({
                            color: multiplyAlpha(stop.color, gradient.opacity),
                            position: round(stop.position)
                        }))
                    };
                }
            } else {
                figma.ui.postMessage({type: 'error', message: 'Invalid gradient transform data.'});
            }
        } else {
            figma.ui.postMessage({
                type: 'error',
                message: 'No linear or radial gradient fill found on the selected node or transform data is missing.'
            });
        }
    } else {
        figma.ui.postMessage({type: 'error', message: 'No selection or no fills found.'});
    }
    return gradientData;
}


if (figma.mode === "codegen") {
    // @ts-ignore
    figma.codegen.on("preferenceschange", (event) => {
        if (event.propertyName === "example") {
            figma.showUI(
                "<style>body { font-family: system-ui, -apple-system, sans-serif; }</style><p>An iframe for external requests or custom settings!</p>",
                {
                    width: 300,
                    height: 300,
                }
            );
        }
    });

    figma.showUI(__html__, { visible: false });

    // @ts-ignore
    figma.codegen.on("generate", (event) => {
        return new Promise(async (resolve) => {
            let gradientData = getGradientData();
            resolve([
                {
                    // @ts-ignore
                    title: "Gradient Data",
                    code: JSON.stringify(gradientData, null, 2),
                    language: "JSON",
                }
            ]);
        });
    });
} else {
    figma.showUI(__html__, { width: 300, height: 600, visible: true});
    figma.ui.postMessage({ type: 'mode', mode: figma.mode });
    
    figma.ui.onmessage = message => {
        if (message.type === 'copy-gradient') {
            let gradientData = getGradientData();
            if (gradientData)
                figma.ui.postMessage({type: 'gradient-data', gradientData});
        }
    };
}
