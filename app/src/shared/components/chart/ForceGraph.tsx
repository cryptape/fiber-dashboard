"use client";

import { GraphData, NodeObject } from "force-graph";
import { useEffect, useRef, useState } from "react";

export interface ForceGraphProps<N extends NodeObject = NodeObject> {
  graphData: GraphData;
  height?: string;
  className?: string;
  nodeAutoColorBy?: string;
  linkAutoColorBy?: string;
  nodeHoverUI?: (node: N) => React.ReactNode;
}

export default function ColorForceGraph<N extends NodeObject = NodeObject>({
  graphData,
  height = "600px",
  className = "",
  nodeAutoColorBy,
  linkAutoColorBy,
  nodeHoverUI,
}: ForceGraphProps<N>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);
  const [hoverState, setHoverState] = useState<{
    node: N;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !graphData.nodes.length) return;

    const container = containerRef.current;

    // Clear previous graph
    if (graphRef.current) {
      container.innerHTML = "";
    }

    // Dynamically import and create force-graph
    const initGraph = async () => {
      try {
        const ForceGraphModule = await import("force-graph");
        const ForceGraphConstructor =
          ForceGraphModule.default || ForceGraphModule;

        // Create new graph
        const graph = new ForceGraphConstructor(container)
          .graphData(graphData)
          .nodeLabel(() => "")
          .width(container.offsetWidth)
          .height(container.offsetHeight);

        // Apply auto-color settings if provided
        if (nodeAutoColorBy) {
          graph.nodeAutoColorBy(nodeAutoColorBy);
        }
        if (linkAutoColorBy) {
          graph.linkAutoColorBy(linkAutoColorBy);
        }

        // Add custom hover handling for UI rendering
        if (nodeHoverUI) {
          let currentNode: N | null = null;

          graph.onNodeHover(node => {
            currentNode = node as N;
            if (node) {
              // Set initial hover state with current mouse position
              setHoverState(prev => ({
                node: node as N,
                position: prev?.position || { x: 0, y: 0 },
              }));
            } else {
              setHoverState(null);
            }
          });

          // Track mouse movement for hover UI positioning
          const handleMouseMove = (event: MouseEvent) => {
            if (currentNode) {
              setHoverState(prev =>
                prev
                  ? {
                      ...prev,
                      position: { x: event.clientX, y: event.clientY },
                    }
                  : null
              );
            }
          };
          container.addEventListener("mousemove", handleMouseMove);
          return () => {
            container.removeEventListener("mousemove", handleMouseMove);
          };
        }

        graphRef.current = graph;
      } catch (error) {
        console.error("Failed to load force-graph:", error);
      }
    };

    initGraph();
  }, [graphData, nodeAutoColorBy, linkAutoColorBy, nodeHoverUI]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`w-full rounded-lg border bg-background overflow-hidden ${className}`}
        style={{ height }}
      />
      {hoverState && nodeHoverUI && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: hoverState.position.x,
            top: hoverState.position.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {nodeHoverUI(hoverState.node)}
        </div>
      )}
    </div>
  );
}
