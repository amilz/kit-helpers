export function mdHeading(text: string, level: number): string {
    return `${'#'.repeat(level)} ${text}`;
}

export function mdCodeBlock(code: string, lang = 'ts'): string {
    return `\`\`\`${lang}\n${code}\n\`\`\``;
}

export function mdLink(text: string, url: string): string {
    return `[${text}](${url})`;
}

export function mdList(items: string[]): string {
    return items.map(item => `- ${item}`).join('\n');
}

export function mdTable(headers: string[], rows: string[][]): string {
    const separator = headers.map(() => '---');
    const lines = [headers, separator, ...rows].map(row => `| ${row.join(' | ')} |`);
    return lines.join('\n');
}
