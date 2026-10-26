// Windows PowerShell 5.1 的 UTF8 文件可能带 BOM。仅移除文件开头的 BOM。
export const parseJsonText=text=>JSON.parse(text.replace(/^\uFEFF/,''));
