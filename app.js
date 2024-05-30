
const PRINT_WIDTH = 50;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatCode({ language, code, printWidth = PRINT_WIDTH }) {
    switch (language) {
        case "JSON":
            return JSON.stringify(JSON.parse(code), null, 2);
    }
}

// eslint-disable-next-line no-undef
window.onmessage = ({ data: { pluginMessage } }) => {
    if (pluginMessage.type === "FORMAT") {
        const result = formatCode(pluginMessage);
        // eslint-disable-next-line no-undef
        parent.postMessage(
            {
                pluginMessage: {
                    id: pluginMessage.id,
                    result,
                    type: "FORMAT_RESULT",
                },
            },
            "*"
        );
    }
};