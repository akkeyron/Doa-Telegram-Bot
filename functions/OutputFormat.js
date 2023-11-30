export function OutputArab(input) {
    var OutputString = `<b>${input.doa}</b>\n\n`;

    for (let i = 0; i < input.arab.length; i++) {
        OutputString += `${input.arab[i]}\n\n<i>${input.makna[i]}</i>\n\n\n`;
    }

    return OutputString;
}

export function OutputRumi(input) {
    var OutputString = `<b>${input.doa}</b>\n\n`;

    for (let i = 0; i < input.rumi.length; i++) {
        OutputString += `${input.rumi[i]}\n\n<i>${input.makna[i]}</i>\n\n\n`;
    }

    return OutputString;
}
