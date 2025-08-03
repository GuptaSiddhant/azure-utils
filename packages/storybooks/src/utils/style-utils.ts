export function css(strings: TemplateStringsArray, ...values: unknown[]) {
  let fullStr = "";
  for (let i = 0; i <= strings.length; i++) {
    const str = strings[i];
    if (str) {
      fullStr += str;
    }

    const value = values[i];
    if (value) {
      fullStr += String(value);
    }
  }

  return fullStr.replace(/\s+/g, " ");
}
