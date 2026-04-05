import { ValidationResult } from "@/types";

// ─── Abstract Expression ──────────────────────────────────────────────────────
interface HTMLExpression {
  interpret(html: string): boolean;
  getErrorMessage(): string;
  getHint(): string;
}

// ─── Terminal Expression: single HTML tag check ───────────────────────────────
export class TagExpression implements HTMLExpression {
  private tag: string;

  constructor(tag: string) {
    this.tag = tag.toLowerCase();
  }

  interpret(html: string): boolean {
    const normalized = html.toLowerCase();
    // Match opening tag: <tag> or <tag ...>
    const regex = new RegExp(`<${this.tag}[\\s>]`, "i");
    return regex.test(normalized) || normalized.includes(`<${this.tag}>`);
  }

  getErrorMessage(): string {
    return `Missing <${this.tag}> element.`;
  }

  getHint(): string {
    const hints: Record<string, string> = {
      h1: 'You forgot an <h1> heading. Try adding: <h1>Your Title</h1>',
      p: 'You need a <p> paragraph. Try adding: <p>Some text here.</p>',
      button:
        'Add a <button> element. Try: <button>Click Me!</button>',
      form: 'Wrap your inputs in a <form action="#" method="post"> ... </form>',
      input: 'Add an <input type="text"> inside your form.',
      label: 'Add <label> elements before each input for accessibility.',
      style: 'Add a <style> block inside your <head> section.',
    };
    return hints[this.tag] ?? `Add a <${this.tag}> element to your HTML.`;
  }
}

// ─── Composite Expression: AND logic (all must pass) ─────────────────────────
export class AndExpression implements HTMLExpression {
  private expressions: HTMLExpression[];

  constructor(expressions: HTMLExpression[]) {
    this.expressions = expressions;
  }

  interpret(html: string): boolean {
    return this.expressions.every((expr) => expr.interpret(html));
  }

  getErrorMessage(): string {
    return "Multiple required elements are missing.";
  }

  getHint(): string {
    return this.expressions.map((e) => e.getHint()).join(" ");
  }
}

// ─── Tag Validator ────────────────────────────────────────────────────────────
export class TagValidator {
  private expressions: TagExpression[];

  constructor(requiredTags: string[]) {
    this.expressions = requiredTags.map((tag) => new TagExpression(tag));
  }

  validate(html: string): ValidationResult {
    const errors: string[] = [];
    const hints: string[] = [];

    for (const expr of this.expressions) {
      if (!expr.interpret(html)) {
        errors.push(expr.getErrorMessage());
        hints.push(expr.getHint());
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      hints,
    };
  }
}

// ─── Convenience factory ──────────────────────────────────────────────────────
export function createValidatorForStep(requiredTags: string[]): TagValidator {
  return new TagValidator(requiredTags);
}
