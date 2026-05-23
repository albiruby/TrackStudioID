/**
 * Combines multiple class name values into a single space-separated string.
 * Native, dependency-free implementation to optimize compilation.
 */
export function cn(...inputs: (string | boolean | undefined | null | { [key: string]: boolean })[]) {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }
  
  return classes.filter(Boolean).join(' ');
}
