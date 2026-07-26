export function renderGraph(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || !window.vis) {
        return;
    }

    const typeColors = {
        CLASS: { background: "#4A90D9", border: "#2E6BA8", highlight: { background: "#6BA3E0", border: "#2E6BA8" } },
        INTERFACE: { background: "#50C878", border: "#2E8B57", highlight: { background: "#72D48E", border: "#2E8B57" } },
        RECORD: { background: "#E8A838", border: "#C48820", highlight: { background: "#EDBA5C", border: "#C48820" } },
        ABSTRACT: { background: "#9B59B6", border: "#7D3C98", highlight: { background: "#B07CC6", border: "#7D3C98" } },
        NONE: { background: "#95A5A6", border: "#7F8C8D", highlight: { background: "#B0BEC5", border: "#7F8C8D" } }
    };

    const nodes = new vis.DataSet(
        data.nodes.map((node) => ({
            id: node.id,
            label: node.label,
            shape: "box",
            margin: 10,
            font: { color: "#ffffff", face: "Segoe UI", size: 14 },
            color: typeColors[node.type] ?? typeColors.NONE
        }))
    );

    const edges = new vis.DataSet(
        data.edges.map((edge) => ({
            from: edge.from,
            to: edge.to,
            arrows: "to",
            color: { color: "#94a3b8", highlight: "#64748b" },
            smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.4 }
        }))
    );

    const options = {
        layout: {
            hierarchical: {
                enabled: true,
                direction: "UD",
                sortMethod: "directed",
                levelSeparation: 120,
                nodeSpacing: 160
            }
        },
        physics: {
            enabled: false
        },
        interaction: {
            hover: true,
            navigationButtons: true,
            keyboard: true,
            tooltipDelay: 150
        },
        nodes: {
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: 2,
            shadow: false
        }
    };

    if (container._network) {
        container._network.destroy();
    }

    container._network = new vis.Network(container, { nodes, edges }, options);
}

export function destroyGraph(containerId) {
    const container = document.getElementById(containerId);
    if (container?._network) {
        container._network.destroy();
        container._network = null;
    }
}
