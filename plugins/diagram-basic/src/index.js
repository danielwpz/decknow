import { DKFlow, DKFlowStep, flowSchema, flowStyles } from "./flow.js";
import { DKPyramid, DKPyramidLevel, pyramidSchema, pyramidStyles } from "./pyramid.js";

export function createDiagramBasicPlugin(version) {
  return {
    name: "diagram-basic",
    version,
    kind: "component",
    elements: {
      "dk-flow": DKFlow,
      "dk-flow-step": DKFlowStep,
      "dk-pyramid": DKPyramid,
      "dk-pyramid-level": DKPyramidLevel,
    },
    selectable: ["dk-flow", "dk-flow-step", "dk-pyramid", "dk-pyramid-level"],
    styles: [
      {
        id: "flow",
        css: flowStyles,
      },
      {
        id: "pyramid",
        css: pyramidStyles,
      },
    ],
    schema: {
      elements: {
        ...flowSchema,
        ...pyramidSchema,
      },
    },
    meta: {
      templates: ["flow", "pyramid"],
    },
  };
}
